/**
 * ============================================================
 * Cloudflare Worker — GitHub 업로드 프록시 (Level B 백엔드)
 * ============================================================
 *
 * 역할: 브라우저(script.js)가 보낸 업로드 요청을 받아
 *   1) 비밀번호를 검증하고
 *   2) GitHub Personal Access Token(PAT)으로 GitHub Contents API를 호출해
 *      실제 파일을 저장소에 커밋합니다.
 * PAT은 절대 브라우저 코드에 들어가지 않고, 이 워커의 "환경변수(Secret)"에만 저장됩니다.
 *
 * ---------- 배포 방법 (요약) ----------
 * 1. Cloudflare 계정 가입 → Workers & Pages → Create Worker
 * 2. wrangler CLI 사용 시:
 *      npm install -g wrangler
 *      wrangler init snu-fintech-uploader
 *      (이 파일을 src/index.js 로 저장)
 *      wrangler secret put GITHUB_TOKEN        # GitHub PAT 입력 (repo 쓰기 권한 필요)
 *      wrangler secret put UPLOAD_PASSWORD     # 업로드 비밀번호 입력
 *      wrangler deploy
 * 3. 배포 후 나오는 URL을 script.js의 CONFIG.UPLOAD_ENDPOINT 에 "/upload"를 붙여 넣습니다.
 *    예: https://snu-fintech-uploader.<subdomain>.workers.dev/upload
 *
 * GitHub PAT 발급: GitHub → Settings → Developer settings →
 *   Personal access tokens → Fine-grained tokens →
 *   해당 저장소(binsue0/.github)에 대해 "Contents: Read and write" 권한만 부여
 * ============================================================
 */

export default {
  async fetch(request, env) {
    // CORS preflight 대응 (다른 도메인의 홈페이지에서 호출하는 경우 필요)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return jsonResponse({ message: "POST 요청만 허용됩니다." }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ message: "잘못된 요청 형식입니다." }, 400);
    }

    const { owner, repo, branch, path, content, message, password } = body;

    // 1) 비밀번호 검증
    if (!password || password !== env.UPLOAD_PASSWORD) {
      return jsonResponse({ message: "비밀번호가 올바르지 않습니다." }, 401);
    }

    // 2) 필수 필드 확인
    if (!owner || !repo || !path || !content) {
      return jsonResponse({ message: "필수 항목이 누락되었습니다." }, 400);
    }

    // 3) 기존 파일 여부 확인 (있으면 sha가 필요 → 업데이트로 처리)
    const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(
      path
    )}`;

    let existingSha = null;
    try {
      const existing = await githubFetch(`${contentsUrl}?ref=${branch}`, env);
      if (existing.status === 200) {
        const existingJson = await existing.json();
        existingSha = existingJson.sha;
      }
    } catch (e) {
      // 파일이 없으면 404가 정상이므로 무시하고 신규 생성으로 진행
    }

    // 4) GitHub Contents API로 파일 생성/업데이트 (PUT)
    const putRes = await githubFetch(contentsUrl, env, {
      method: "PUT",
      body: JSON.stringify({
        message: message || `업로드: ${path}`,
        content, // 이미 base64 인코딩된 상태로 전달받음
        branch: branch || "main",
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });

    if (!putRes.ok) {
      const errBody = await putRes.json().catch(() => ({}));
      return jsonResponse(
        { message: errBody.message || "GitHub 업로드에 실패했습니다." },
        putRes.status
      );
    }

    const result = await putRes.json();
    return jsonResponse({
      message: "업로드 성공",
      url: result.content?.html_url,
    });
  },
};

async function githubFetch(url, env, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "snu-fintech-uploader",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

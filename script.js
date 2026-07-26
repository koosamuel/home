/* =========================================================
   서울대 빅데이터 핀테크 AI 고급 전문과정 13기 - 수업자료 아카이브
   tabs / 파일목록(GitHub API) / 드래그앤드롭 업로드(서버리스 함수 경유)
   ========================================================= */

/* ---------------------------------------------------------
   설정값 — 저장소·경로·업로드 엔드포인트를 여기서만 관리합니다.
   --------------------------------------------------------- */
const CONFIG = {
  GITHUB_OWNER: "binsue0",
  GITHUB_REPO: ".github",
  GITHUB_BRANCH: "main",

  // 통계 탭 하위 폴더가 매핑되는 실제 저장소 경로
  FOLDER_PATHS: {
    project_progress: "Basic_day1/project_progress",
    lecture_materials: "Basic_day1/lecture_materials",
  },

  // Level B 업로드를 처리할 서버리스 함수(Cloudflare Worker) 주소.
  // 배포 후 이 값을 실제 워커 URL로 교체하세요.
  // 예: "https://snu-fintech-uploader.<your-subdomain>.workers.dev/upload"
  UPLOAD_ENDPOINT: "https://REPLACE-WITH-YOUR-WORKER-URL.workers.dev/upload",

  MAX_FILE_SIZE_MB: 25,
  ALLOWED_EXTENSIONS: [".pdf", ".py", ".ipynb", ".js", ".html", ".css", ".txt", ".md", ".csv", ".json"],
};

/* ---------------------------------------------------------
   업로드 비밀번호 — 세션 동안만 메모리에 보관 (새로고침하면 다시 입력)
   실제 검증은 서버(Worker) 쪽에서 이루어지므로, 여기서는 입력값을
   그대로 전달만 합니다. 클라이언트 코드에 정답 비밀번호를 절대
   하드코딩하지 마세요.
   --------------------------------------------------------- */
let cachedPassword = null;

/* =========================================================
   1. 탭 전환 (통계 / 기계학습과 딥러닝)
   ========================================================= */
function initMainTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;

      tabButtons.forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });

      document.querySelectorAll(".tab-panel").forEach((panel) => {
        const isTarget = panel.id === `panel-${target}`;
        panel.classList.toggle("is-active", isTarget);
        panel.hidden = !isTarget;
      });
    });
  });
}

/* =========================================================
   2. 하위 폴더 서브탭 전환 (프로젝트 진행 내역 / 수업자료)
   ========================================================= */
function initSubTabs() {
  const subtabButtons = document.querySelectorAll(".subtab-btn");
  subtabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const folder = btn.dataset.folder;

      subtabButtons.forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });

      document.querySelectorAll(".folder-panel").forEach((panel) => {
        panel.classList.toggle("is-active", panel.id === `folder-${folder}`);
      });
    });
  });
}

/* =========================================================
   3. GitHub 저장소 파일 목록 불러오기 (읽기 전용, 인증 불필요)
   ========================================================= */
async function loadFileList(folderKey, listElId) {
  const listEl = document.getElementById(listElId);
  listEl.innerHTML = `<li class="file-list-loading">불러오는 중...</li>`;

  const path = CONFIG.FOLDER_PATHS[folderKey];
  const url = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${path}?ref=${CONFIG.GITHUB_BRANCH}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (res.status === 404) {
      // 폴더가 아직 없는 경우 (첫 업로드 전)
      listEl.innerHTML = `<li class="file-list-empty">아직 업로드된 파일이 없습니다.</li>`;
      return;
    }
    if (!res.ok) throw new Error(`GitHub API 오류 (${res.status})`);

    const items = await res.json();
    const files = (Array.isArray(items) ? items : []).filter((i) => i.type === "file");

    if (files.length === 0) {
      listEl.innerHTML = `<li class="file-list-empty">아직 업로드된 파일이 없습니다.</li>`;
      return;
    }

    listEl.innerHTML = "";
    files
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((file) => listEl.appendChild(renderFileRow(file)));
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<li class="file-list-empty">목록을 불러오지 못했습니다. (GitHub API 요청 제한일 수 있습니다)</li>`;
  }
}

function renderFileRow(file) {
  const li = document.createElement("li");
  const ext = file.name.split(".").pop().toLowerCase();
  const isPdf = ext === "pdf";
  const iconLabel = isPdf ? "PDF" : ext.slice(0, 3).toUpperCase();

  li.innerHTML = `
    <span class="file-icon ${isPdf ? "pdf" : "code"}">${iconLabel}</span>
    <a class="file-name" href="${file.html_url}" target="_blank" rel="noopener">${file.name}</a>
    <span class="file-meta">${formatBytes(file.size)}</span>
  `;
  return li;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* =========================================================
   4. 비밀번호 모달 (Promise 기반)
   ========================================================= */
function askPassword() {
  return new Promise((resolve) => {
    const backdrop = document.getElementById("passwordModal");
    const input = document.getElementById("uploadPassword");
    const errorMsg = document.getElementById("modalError");
    const confirmBtn = document.getElementById("modalConfirm");
    const cancelBtn = document.getElementById("modalCancel");

    errorMsg.hidden = true;
    input.value = "";
    backdrop.hidden = false;
    input.focus();

    function cleanup() {
      backdrop.hidden = true;
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
      input.removeEventListener("keydown", onKeydown);
    }
    function onConfirm() {
      cleanup();
      resolve(input.value);
    }
    function onCancel() {
      cleanup();
      resolve(null);
    }
    function onKeydown(e) {
      if (e.key === "Enter") onConfirm();
      if (e.key === "Escape") onCancel();
    }

    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
    input.addEventListener("keydown", onKeydown);
  });
}

/* =========================================================
   5. 드래그앤드롭 업로드
   ========================================================= */
function initDropzone() {
  const dropzone = document.getElementById("dropzone-project");
  const fileInput = document.getElementById("fileInput-project");

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") fileInput.click();
  });

  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) handleFiles(files);
  });

  fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files || []);
    if (files.length) handleFiles(files);
    fileInput.value = ""; // 같은 파일 재선택 가능하도록 초기화
  });
}

async function handleFiles(files) {
  const validFiles = files.filter((f) => validateFile(f));
  if (validFiles.length === 0) return;

  if (cachedPassword === null) {
    const pw = await askPassword();
    if (pw === null) return; // 사용자가 취소
    cachedPassword = pw;
  }

  for (const file of validFiles) {
    await uploadOneFile(file);
  }

  loadFileList("project_progress", "fileList-project");
}

function validateFile(file) {
  const sizeOk = file.size <= CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024;
  const ext = "." + file.name.split(".").pop().toLowerCase();
  const extOk = CONFIG.ALLOWED_EXTENSIONS.includes(ext);

  if (!sizeOk) {
    alert(`"${file.name}" 파일이 ${CONFIG.MAX_FILE_SIZE_MB}MB를 초과합니다.`);
    return false;
  }
  if (!extOk) {
    alert(`"${file.name}"은 허용되지 않는 파일 형식입니다.`);
    return false;
  }
  return true;
}

function addQueueItem(fileName) {
  const queue = document.getElementById("uploadQueue-project");
  const li = document.createElement("li");
  li.className = "upload-item";
  li.innerHTML = `
    <span class="upload-item-name">${fileName}</span>
    <span class="upload-item-bar"><span class="upload-item-bar-fill"></span></span>
    <span class="upload-item-status">업로드 중...</span>
  `;
  queue.appendChild(li);
  return li;
}

async function uploadOneFile(file) {
  const itemEl = addQueueItem(file.name);
  const barFill = itemEl.querySelector(".upload-item-bar-fill");
  const statusEl = itemEl.querySelector(".upload-item-status");
  barFill.style.width = "35%";

  try {
    const base64Content = await fileToBase64(file);
    barFill.style.width = "70%";

    const res = await fetch(CONFIG.UPLOAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: CONFIG.GITHUB_OWNER,
        repo: CONFIG.GITHUB_REPO,
        branch: CONFIG.GITHUB_BRANCH,
        path: `${CONFIG.FOLDER_PATHS.project_progress}/${file.name}`,
        content: base64Content,
        message: `업로드: ${file.name} (수업자료 아카이브)`,
        password: cachedPassword,
      }),
    });

    if (res.status === 401) {
      cachedPassword = null; // 비밀번호 오류 → 다음 업로드 때 다시 물어봄
      throw new Error("비밀번호가 올바르지 않습니다.");
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `업로드 실패 (${res.status})`);
    }

    itemEl.classList.add("is-success");
    statusEl.textContent = "완료";
  } catch (err) {
    console.error(err);
    itemEl.classList.add("is-error");
    statusEl.textContent = err.message || "업로드 실패";
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // data:application/pdf;base64,XXXX... 형태에서 base64 부분만 추출
      const result = reader.result;
      const base64 = result.substring(result.indexOf(",") + 1);
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* =========================================================
   초기화
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  initMainTabs();
  initSubTabs();
  initDropzone();

  loadFileList("project_progress", "fileList-project");
  loadFileList("lecture_materials", "fileList-lecture");

  document
    .getElementById("refreshBtn-project")
    .addEventListener("click", () => loadFileList("project_progress", "fileList-project"));
  document
    .getElementById("refreshBtn-lecture")
    .addEventListener("click", () => loadFileList("lecture_materials", "fileList-lecture"));
});

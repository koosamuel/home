* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    background: #f4f7fb;
    color: #333;
    line-height: 1.6;
}

.hero {
    background: #2563eb;
    color: white;
    text-align: center;
    padding: 60px 20px;
}

.subtitle {
    font-size: 1.3rem;
    margin: 10px 0;
}

button {
    margin-top: 20px;
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    background: white;
    color: #2563eb;
    font-size: 16px;
    cursor: pointer;
    transition: 0.3s;
}

button:hover {
    background: #e5e7eb;
}

.container {
    max-width: 1000px;
    margin: 30px auto;
    padding: 0 20px;
}

.card {
    background: white;
    padding: 25px;
    border-radius: 12px;
    margin-bottom: 20px;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}

.card h2 {
    color: #2563eb;
    margin-bottom: 15px;
}

.card p {
    margin-bottom: 10px;
}

.card ul {
    padding-left: 20px;
}

.card li {
    margin-bottom: 8px;
}

.skills {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 15px;
}

.skills span {
    background: #2563eb;
    color: white;
    padding: 8px 14px;
    border-radius: 20px;
    font-size: 14px;
}

#message {
    margin-top: 15px;
    font-weight: bold;
    color: yellow;
}

footer {
    background: #1f2937;
    color: white;
    text-align: center;
    padding: 20px;
    margin-top: 30px;
}

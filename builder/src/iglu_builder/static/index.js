let socket;

//biome-ignore lint/correctness/noUnusedVariables: loaded with "onload" in html
function onload() {
    connect();

    document.getElementById("build").addEventListener("click", () => {
        updateConStatus();
        build();
    });

    document.getElementById("connect").addEventListener("click", () => {
        connect();
        updateConStatus();
    });
}

function connect() {
    if (
        !socket ||
        (socket.readyState !== WebSocket.CONNECTING && socket.readyState !== WebSocket.OPEN)
    ) {
        socket = new WebSocket("ws://127.0.0.1:8000/api/v1/build");
        socket.onopen = () => updateConStatus();
        socket.onclose = () => updateConStatus();
        socket.onerror = () => updateConStatus;
        socket.onmessage = (event) => {
            updateConStatus();
            const output = document.getElementById("output");
            const line = document.createElement("span");
            line.textContent = event.data;
            output.insertBefore(document.createElement("br"), output.firstChild);
            output.insertBefore(line, output.firstChild);
        };
    }
}

async function build() {
    document.getElementById("output").innerHTML = "";
    const command = document.getElementById("command").value;

    const repo_url = document.getElementById("repo_url").value;
    const branch = document.getElementById("branch").vlaue;

    const cache_url = document.getElementById("cache_url").value;
    const auth_token = document.getElementById("auth_token").value;
    const signing_keys = document.getElementById("signing_key").value;

    const message = {
        command: command.split(" "),
    };

    if (repo_url !== "") {
        message.repo = {};
        message.repo.url = repo_url;

        if (branch !== "") {
            message.repo.branch = branch;
        }
    }

    if (cache_url !== "") {
        message.cache = {
            url: cache_url,
            auth_token: auth_token,
            signing_keys: signing_keys,
        };
    }
    console.log(message);
    await socket.send(JSON.stringify(message));
}

function updateConStatus() {
    const txtStatus = document.getElementById("status");
    if (socket.readyState === WebSocket.CONNECTING) {
        txtStatus.innerHTML = "connecting";
    } else if (socket.readyState === WebSocket.OPEN) {
        txtStatus.innerHTML = "connected";
    } else if (socket.readyState === WebSocket.CLOSED) {
        txtStatus.innerHTML = "closed";
    } else if (socket.readyState === WebSocket.CLOSING) {
        txtStatus.innerHTML = "closing";
    }
}

export const ws = [
    async (socket: WebSocket) => {
        socket.send(
            JSON.stringify({
                agent: "cf680427-5de4-418c-8719-39ad36c22e31",
                command: {
                    contents: {
                        cache: {
                            cacheName: "boerg",
                            isPublic: true,
                            publicKey: "vIlIMV8QI/zRVUSdlGNJuCEMcOfNKgTs4VSVkSFPMHs=",
                        },
                        id: "cf680427-5de4-418c-8719-39ad36c22e31",
                    },
                    tag: "AgentRegistered",
                },
                id: "caa1ec78-3985-4748-933f-3dbf8a61f74c",
                method: "AgentRegistered",
            }),
        );

        setTimeout(() => {
            socket.send(
                JSON.stringify({
                    agent: "3e25eb05-d855-431a-a656-c5f93bf877a2",
                    command: {
                        contents: {
                            id: "276fb0ea-b457-4f37-8516-5b30aa8f8581",
                            index: 4,
                            rollbackScript: null,
                            storePath: "/nix/store/something.nar",
                        },
                        tag: "Deployment",
                    },
                    id: "015fd327-5da9-4df6-8c63-79ff2222453c",
                    method: "Deployment",
                }),
            );
        }, 1000);
        //socket.send('Connected')
        setTimeout(() => {
            console.log("Sending agentinformation method");
            socket.send(
                JSON.stringify({
                    agent: "3e25eb05-d855-431a-a656-c5f93bf877a2",
                    id: "015fd327-5da9-4df6-8c63-79ff2222453c",
                    method: "AgentInformation",
                }),
            );
        }, 3000);
        socket.onmessage = (msg) => {
            console.log("MSG Received:", msg.data.toString());
        };

        socket.onclose = () => {
            console.log("socket closed");
        };
    },
];

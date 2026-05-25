// Hello World plugin — runs in the sandbox.
// The host injects `window.inkstone`; the host then calls `activate(api)`.

function activate(api) {
  const cmd = api.commands.register({
    id: "hello-world.greet",
    title: "Hello: Greet me",
    run: function () {
      api.ui.toast({
        title: "Hello!",
        message: "Greetings from the Hello World plugin.",
        kind: "success",
      });
    },
  });
  return { dispose: function () { cmd.dispose(); } };
}

// Globals are picked up by the sandbox bootstrap.
window.activate = activate;

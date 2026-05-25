// Word Counter plugin — sandboxed.
function countWords(text) {
  if (!text) return 0;
  const m = String(text).trim().match(/\S+/g);
  return m ? m.length : 0;
}

function activate(api) {
  let item = api.statusBar.addItem({
    id: "wc.count",
    text: "0 words",
    tooltip: "Word count",
    align: "right",
    priority: 100,
  });

  function refresh(doc) {
    item.dispose();
    item = api.statusBar.addItem({
      id: "wc.count",
      text: countWords(doc ? doc.content : "") + " words",
      tooltip: "Word count",
      align: "right",
      priority: 100,
    });
  }

  api.workspace.activeDocument().then(refresh);
  const sub = api.workspace.onActiveDocumentChange(refresh);

  return { dispose: function(){ sub.dispose(); item.dispose(); } };
}

window.activate = activate;

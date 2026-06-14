async function main() {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return;
  }

  await editor.edit((editBuilder) => {
    for (const selection of editor.selections) {
      const pos = selection.active;

      editBuilder.insert(pos, "    ");
    }
  });
}

main();

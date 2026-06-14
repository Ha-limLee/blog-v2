async function main() {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return;
  }

  await editor.edit((editBuilder) => {
    for (const selection of editor.selections) {
      const pos = selection.active;

      // Need at least 4 chars before cursor
      if (pos.character < 4) {
        continue;
      }

      const start = new vscode.Position(pos.line, pos.character - 4);

      const range = new vscode.Range(start, pos);

      const text = editor.document.getText(range);

      // Delete only if exactly 4 spaces
      if (text === "    ") {
        editBuilder.delete(range);
      }
    }
  });
}

main();

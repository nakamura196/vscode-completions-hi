import * as vscode from "vscode";
import axios from "axios";

export function activate(context: vscode.ExtensionContext) {
  const triggerCharacter: any = vscode.workspace
    .getConfiguration("vscode-completions-hi")
    .get("triggerCharacter");

  //パネルを作成する
  const provider1 = vscode.languages.registerCompletionItemProvider(
    ["plaintext", "xml"],
    {
      async provideCompletionItems(document, position) {
        const api = vscode.workspace
          .getConfiguration("vscode-completions-hi")
          .get("api");
        // get all text until the `position` and check if it reads `console.`
        // and if so then complete if `log`, `warn`, and `error`
        let linePrefix: string = document
          .lineAt(position)
          .text.substr(0, position.character);

        //後方の文字列
        let lineSuffix: string = document
          .lineAt(position)
          .text.substr(position.character);

        //タグで分割
        const tags = [" ", "。", "#", '"', ">", "<", "."];

        //タグで分割された文字列
        let modifiedLinePrefix = linePrefix;
        let modifiedLineSuffix = lineSuffix;
        for (const tag of tags) {
          //後方

          let spl = modifiedLineSuffix.split(tag);
          modifiedLineSuffix = spl[0];

          if (tag === triggerCharacter) {
            continue;
          }

          //前方

          spl = modifiedLinePrefix.split(tag);
          modifiedLinePrefix = spl[spl.length - 1];
        }

        let modifiedLinePrefix2 = modifiedLinePrefix;

        const queryText = modifiedLinePrefix.replace(triggerCharacter, "");

        const text = queryText + "[MASK]" + modifiedLineSuffix;

        const url = api + encodeURIComponent(text);

        const results = [];

        try {
          const { data } = await axios.get(url);

          for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const index = i + 1;
            const p = item.token_str;

            const label = `${modifiedLinePrefix2}${p} (${(
              item.score * 100
            ).toFixed(1)}%)`;

            const commandCompletion = new vscode.CompletionItem(label);

            let insertText =
              (modifiedLinePrefix.includes(triggerCharacter)
                ? modifiedLinePrefix.split(triggerCharacter)[1]
                : modifiedLinePrefix) + p;

            commandCompletion.kind = vscode.CompletionItemKind.Variable;
            commandCompletion.sortText = String(index);
            commandCompletion.keepWhitespace = true;
            commandCompletion.insertText = insertText;
            commandCompletion.detail = text;
            if (
              vscode.workspace
                .getConfiguration("vscode-completions-hi")
                .get("re-trigger")
            ) {
              commandCompletion.command = {
                command: "editor.action.triggerSuggest",
                title: "Re-trigger completions...",
              };
            }
            results.push(commandCompletion);
          }
        } catch (e) {
          console.log(e);
        }

        return results;
      },
    },
    triggerCharacter
  );

  context.subscriptions.push(provider1);
}

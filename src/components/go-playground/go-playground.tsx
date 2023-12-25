import { Component, Host, Prop, h, State } from '@stencil/core';
import { basicSetup } from 'codemirror';
import { EditorView, keymap } from '@codemirror/view';
// import { indentWithTab } from '@codemirror/commands';
import { html } from '@codemirror/lang-html';
import { vscodeKeymap } from '@replit/codemirror-vscode-keymap';
import { Compartment, EditorState } from '@codemirror/state';
import { dracula } from 'thememirror/dist/themes/dracula';
import { debounce } from 'lodash-es';
import { GO_UI_HEAD, PLACEHOLDER_CONTENT } from './consts';

@Component({
  tag: 'go-playground',
  styleUrl: 'go-playground.scss',
  shadow: false,
})
export class GoPlayground {
  editorEl: HTMLElement;
  iframeEl: HTMLIFrameElement;
  iframeContainerEl: HTMLElement;
  view: EditorView;
  isDirty: boolean = false;

  /**
   * initial code
   */
  @Prop({ mutable: true }) code: string = PLACEHOLDER_CONTENT;

  @Prop() logoSrc: string = ``;

  @State()
  head: string = `<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
<!-- inception, this loads the playground inside the demo frame -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@go-ui/demo-frame/dist/demo-frame/demo-frame.esm.js"></script>
`;

  @State() currentTheme = 'dark';

  componentWillLoad() {
    this.syncUrlToContent();
  }

  componentDidLoad() {
    this.setupEditor();

    // set initial content
    this.setPreviewContent(this.code);
  }
  setupEditor() {
    let language = new Compartment();

    let updateListener = EditorView.updateListener.of(update => {
      if (update.docChanged) {
        this.isDirty = true;
        console.log(update.state.doc.toString());
        this.debouncedUpdateContent(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      extensions: [
        basicSetup,
        keymap.of(vscodeKeymap),
        language.of(html()),
        updateListener,
        dracula,
      ],
      doc: this.code,
    });

    this.view = new EditorView({
      state,
      parent: this.editorEl,
    });
  }

  private debouncedUpdateContent = debounce(content => {
    this.setPreviewContent(content);
  }, 500);

  setPreviewContent(content) {
    this.iframeEl?.remove();

    if (this.isDirty) {
      this.syncContentToUrl(content);
    }

    this.iframeEl = document.createElement('iframe');
    this.iframeContainerEl.appendChild(this.iframeEl);
    const doc = this.iframeEl.contentDocument;
    const dir: 'ltr' | 'rtl' = 'ltr';
    const lang = 'en';

    const { head, currentTheme } = this;
    const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}" data-theme="${currentTheme}">
  <head>
    ${GO_UI_HEAD}
    <!-- custom head -->
    ${head}
  </head>
  <body>
    <!-- #region demo start -->
${content}
    <!-- #endregion demo finish -->
  </body>
</html>
`;
    doc.open();
    doc.write(html);
    doc.close();
  }

  syncContentToUrl(content) {
    const url = new URL(window.location.href);
    url.searchParams.set('code', window.btoa(content));
    window.history.pushState(null, '', url.toString());
  }

  syncUrlToContent() {
    const url = new URL(window.location.href);
    const paramCode = url.searchParams.get('code');
    if (paramCode) {
      this.code = window.atob(paramCode);
    }
  }

  setDarkMode(e) {
    this.currentTheme = e.detail.theme;
    this.setPreviewContent(this.code);
  }

  render() {
    const { logoSrc, head } = this;
    return (
      <Host>
        <go-playground-header
          logoSrc={logoSrc}
          onDarkModeChange={e => this.setDarkMode(e)}
        ></go-playground-header>
        <main class="playground-main">
          {/* editor */}
          <div class="editor">
            <go-tabs>
              <go-tab label="HTML">
                <div class="h-100" ref={el => (this.editorEl = el)}></div>
              </go-tab>
              <go-tab label="Head">
                <pre>{GO_UI_HEAD}</pre>
                <pre>{head}</pre>
              </go-tab>
            </go-tabs>
          </div>
          {/* preview */}
          <div
            class="preview-wrapper"
            ref={el => (this.iframeContainerEl = el)}
          ></div>
        </main>
      </Host>
    );
  }
}

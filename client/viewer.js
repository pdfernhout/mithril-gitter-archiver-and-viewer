/* global m */

const GitterArchiveViewer = {
    view: function() {
        return m(".main", [
            m("h1.ba.b--blue", { class: "title" }, "Gitter Archive Viewer"),
            m("div", "Hello, World!")
        ])
    }
}

m.mount(document.body, GitterArchiveViewer)

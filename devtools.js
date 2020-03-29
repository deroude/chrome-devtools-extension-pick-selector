// credits to https://gist.github.com/karlgroves/7544592
function getDomPath(el) {

    function name(el) {
        return el.nodeName.toLowerCase() + (el.shadowRoot ? '::shadowRoot' : '');
    }

    function recurse(el) {
        var stack = [];
        while (el.parentNode) {
            var sibCount = 0;
            var sibIndex = 0;
            for (var i = 0; i < el.parentNode.childNodes.length; i++) {
                var sib = el.parentNode.childNodes[i];
                if (sib.nodeName == el.nodeName) {
                    if (sib === el) {
                        sibIndex = sibCount;
                    }
                    sibCount++;
                }
            }
            if (el.hasAttribute('id') && el.id !== '') {
                stack.unshift(name(el) + '#' + el.id);
            } else if (el.hasAttribute('title') && el.title !== '') {
                stack.unshift(name(el) + '[title=' + el.id + ']');
            } else if (el.children.length === 0 && el.nodeName.toLowerCase() !== 'style' && el.innerText && el.innerText !== '') {
                stack.unshift(name(el) + ':contains(' + el.innerText + ')')
            } else if (el.hasAttribute('class') && el.className !== '') {
                stack.unshift(name(el) + '.' + el.className.split(' ').join('.'));
            } else if (sibCount > 1) {
                stack.unshift(name(el) + ':eq(' + sibIndex + ')');
            } else {
                stack.unshift(name(el));
            }
            el = el.parentNode;
        }
        if (el instanceof ShadowRoot) {
            return [...recurse(el.host), ...stack];
        }
        //found on https://stackoverflow.com/questions/935127/how-to-access-parent-iframe-from-javascript
        var arrFrames = parent.document.getElementsByTagName('IFRAME');;
        for (var i = 0; i < arrFrames.length; i++) {
            if (arrFrames[i].contentDocument === el) {
                stack.unshift("iframe#" + arrFrames[i].id);
                break;
            }
        }
        return stack;
    }

    return recurse(el);
}


chrome.devtools.panels.elements.createSidebarPane("FormulaDB",
    function (sidebar) {
        function getSelector(raw) {
            var fstack = [];
            if (raw && raw.length > 0) {
                if (raw[0].startsWith('iframe')) {
                    fstack.push(raw[0]);
                }
                var foundId = false;
                for (var i = raw.length - 1; i > 1; i--) {
                    if (raw[i].indexOf('#') > -1) {
                        fstack = [...fstack, ...raw.slice(0,i).filter(r => r.indexOf('::shadowRoot')>-1), ...raw.slice(i)];
                        console.log(fstack);
                        foundId = true;
                        break;
                    }
                }
                if (!foundId) fstack = raw;
            }
            sidebar.setObject({ stack: raw, selector: fstack.join(' ') });
        }

        sidebar.setObject({ selector: "Please select an item" });

        chrome.devtools.panels.elements.onSelectionChanged.addListener(function () {
            chrome.devtools.inspectedWindow.eval("(" + getDomPath.toString() + ")($0)", getSelector);
        });
    }
);


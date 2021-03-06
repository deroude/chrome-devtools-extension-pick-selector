// credits to https://gist.github.com/karlgroves/7544592
function getDomPath(el) {

    function name(el) {
        return el.nodeName.toLowerCase() + (el.shadowRoot ? '::shadowRoot' : '');
    }

    function findByText(selector, text) {
        let els = document.querySelectorAll(selector);
        return els.filter(el => el.children.length === 0 && el.nodeName.toLowerCase() !== 'style' && el.innerText && el.innerText === text);
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
            } else if (sibCount > 1) {
                stack.unshift('> ' + name(el) + ':eq(' + sibIndex + ')');
            } else if (el.hasAttribute('class') && el.className !== '') {
                stack.unshift(name(el) + '.' + el.className.split(' ').join('.'));
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

        let containsRegex = /^.*\:contains\((.+?)\)$/i;

        function getSelector(raw) {
            let fstack = [];
            let shortStack = [];
            if (raw && raw.length > 0) {
                if (raw[0].startsWith('iframe')) {
                    fstack.push(raw[0]);
                }
                let foundId = false;
                for (var i = raw.length - 1; i > 1; i--) {
                    if (raw[i].indexOf('#') > -1) {
                        fstack = [...fstack, ...raw.slice(0, i).filter(r => r.indexOf('::shadowRoot')), ...raw.slice(i)];
                        foundId = true;
                    }
                }
                if (!foundId) fstack = raw;
                shortStack = fstack;
                let matchContains = fstack[fstack.length - 1].match(containsRegex);
                if (matchContains !== null && matchContains.length > 1) {
                    shortStack = fstack.slice(0, fstack.length - 2)
                        .filter(s => s.indexOf('iframe') > -1 || s.indexOf('::shadowRoot') > -1 || s.indexOf('#') > -1 || s.indexOf('[title') > -1);
                    // let selector = shortStack.join(' ');
                    // let containsEls = findByText(selector, matchContains[1]);
                    // if (containsEls.length === 1) {
                    // }
                    shortStack = [...shortStack, fstack[fstack.length-1]];
                }
            }
            sidebar.setObject({ stack: raw, selector: fstack.join(' '), short: shortStack.join(' ') });
        }

        sidebar.setObject({ selector: "Please select an item" });

        chrome.devtools.panels.elements.onSelectionChanged.addListener(function () {
            chrome.devtools.inspectedWindow.eval("(" + getDomPath.toString() + ")($0)", getSelector);
        });
    }
);


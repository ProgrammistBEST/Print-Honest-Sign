function general_article(code) {
    if (code.startsWith("1-3")) {
        return code.substring(0, 3);
    } else if (code.startsWith("10-2") || code.startsWith("10-3")) {
        return code.substring(0, 4);
    } else if (code.startsWith("402-1")) {
        return code.substring(0, 3);
    } else if (code.length > 7) {
        for (let i = 2; i < 6; i++) {
            if (code.substring(i).startsWith(code.substring(0, i))) {
                return general_article(code.substring(0, i));
            }
        }
    }
    if (code.startsWith("00") && !code.startsWith("007")) { // Джиббитсы
        if (code.startsWith("00МЕД")) {
            return "Джиббитсы/00МЕД";
        } else if (code.startsWith("00ЖЕН")) {
            return "Джиббитсы/00ЖЕН";
        } else if (code.startsWith("00М")) {
            return "Джиббитсы/00М";
        } else if (code.startsWith("00Д")) {
            return "Джиббитсы/00Д";
        }
    }
    return code.split(/\W+/)[0].replace(/[ .\/-]+$/, "");
}

function get_article(code) {
    if (code.startsWith("00") && !code.startsWith("007")) {  // Джиббитсы
        let count;
        if (code.startsWith("00МЕД")) {
            count = code.substring(5);
        } else if (code.startsWith("00ЖЕН")) {
            count = code.substring(5);
        } else if (code.startsWith("00М")) {
            count = code.substring(3);
        } else if (code.startsWith("00Д")) {
            count = code.substring(3);
        }
        if (!count) {
            count = "6";
        }
        return [count.toString()];
    } else if (code.startsWith("1-3")) {
        return [code.substring(0, 3)];
    } else if (code.startsWith("10-2") || code.startsWith("10-3")) {
        return [code.substring(0, 4)];
    } else if (code.startsWith("402-1")) {
        return [code.substring(0, 5)];
    } else if (code.length > 7) {
        for (let i = 2; i < 6; i++) {
            if (code.substring(i).startsWith(code.substring(0, i))) {
                return [code.substring(0, i)];
            }
        }
    }
    code = code.split(/\W+/).filter(part => !/[a-zA-Z]/.test(part)).join('-').replace(/[-/.\\]+$/, "");
    return [code];
}

module.exports = {
    general_article, get_article
};
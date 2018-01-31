module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true,
    },
    
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module",
        // to get support for async/await
        "ecmaVersion": 8 // or 2017
    },
    "rules": {
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "never"
        ]
    }
};

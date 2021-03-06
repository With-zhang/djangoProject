"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode_1 = require("vscode");
const constants = require("../../common/constants");
const types_1 = require("../common/types");
class TestDisplay {
    constructor(testCollectionStorage) {
        this.testCollectionStorage = testCollectionStorage;
    }
    displayStopTestUI(workspace, message) {
        vscode_1.window.showQuickPick([message]).then(item => {
            if (item === message) {
                vscode_1.commands.executeCommand(constants.Commands.Tests_Stop, undefined, workspace);
            }
        });
    }
    displayTestUI(cmdSource, wkspace) {
        const tests = this.testCollectionStorage.getTests(wkspace);
        vscode_1.window.showQuickPick(buildItems(tests), { matchOnDescription: true, matchOnDetail: true })
            .then(item => onItemSelected(cmdSource, wkspace, item, false));
    }
    selectTestFunction(rootDirectory, tests) {
        return new Promise((resolve, reject) => {
            vscode_1.window.showQuickPick(buildItemsForFunctions(rootDirectory, tests.testFunctions), { matchOnDescription: true, matchOnDetail: true })
                .then(item => {
                if (item && item.fn) {
                    return resolve(item.fn);
                }
                return reject();
            }, reject);
        });
    }
    selectTestFile(rootDirectory, tests) {
        return new Promise((resolve, reject) => {
            vscode_1.window.showQuickPick(buildItemsForTestFiles(rootDirectory, tests.testFiles), { matchOnDescription: true, matchOnDetail: true })
                .then(item => {
                if (item && item.testFile) {
                    return resolve(item.testFile);
                }
                return reject();
            }, reject);
        });
    }
    displayFunctionTestPickerUI(cmdSource, wkspace, rootDirectory, file, testFunctions, debug) {
        const tests = this.testCollectionStorage.getTests(wkspace);
        if (!tests) {
            return;
        }
        const fileName = file.fsPath;
        const testFile = tests.testFiles.find(item => item.name === fileName || item.fullPath === fileName);
        if (!testFile) {
            return;
        }
        const flattenedFunctions = tests.testFunctions.filter(fn => {
            return fn.parentTestFile.name === testFile.name &&
                testFunctions.some(testFunc => testFunc.nameToRun === fn.testFunction.nameToRun);
        });
        vscode_1.window.showQuickPick(buildItemsForFunctions(rootDirectory, flattenedFunctions, undefined, undefined, debug), { matchOnDescription: true, matchOnDetail: true }).then(testItem => {
            return onItemSelected(cmdSource, wkspace, testItem, debug);
        });
    }
}
exports.TestDisplay = TestDisplay;
var Type;
(function (Type) {
    Type[Type["RunAll"] = 0] = "RunAll";
    Type[Type["ReDiscover"] = 1] = "ReDiscover";
    Type[Type["RunFailed"] = 2] = "RunFailed";
    Type[Type["RunFolder"] = 3] = "RunFolder";
    Type[Type["RunFile"] = 4] = "RunFile";
    Type[Type["RunClass"] = 5] = "RunClass";
    Type[Type["RunMethod"] = 6] = "RunMethod";
    Type[Type["ViewTestOutput"] = 7] = "ViewTestOutput";
    Type[Type["Null"] = 8] = "Null";
    Type[Type["SelectAndRunMethod"] = 9] = "SelectAndRunMethod";
    Type[Type["DebugMethod"] = 10] = "DebugMethod";
})(Type || (Type = {}));
const statusIconMapping = new Map();
statusIconMapping.set(types_1.TestStatus.Pass, constants.Octicons.Test_Pass);
statusIconMapping.set(types_1.TestStatus.Fail, constants.Octicons.Test_Fail);
statusIconMapping.set(types_1.TestStatus.Error, constants.Octicons.Test_Error);
statusIconMapping.set(types_1.TestStatus.Skipped, constants.Octicons.Test_Skip);
function getSummary(tests) {
    if (!tests || !tests.summary) {
        return '';
    }
    const statusText = [];
    if (tests.summary.passed > 0) {
        statusText.push(`${constants.Octicons.Test_Pass} ${tests.summary.passed} Passed`);
    }
    if (tests.summary.failures > 0) {
        statusText.push(`${constants.Octicons.Test_Fail} ${tests.summary.failures} Failed`);
    }
    if (tests.summary.errors > 0) {
        const plural = tests.summary.errors === 1 ? '' : 's';
        statusText.push(`${constants.Octicons.Test_Error} ${tests.summary.errors} Error${plural}`);
    }
    if (tests.summary.skipped > 0) {
        statusText.push(`${constants.Octicons.Test_Skip} ${tests.summary.skipped} Skipped`);
    }
    return statusText.join(', ').trim();
}
function buildItems(tests) {
    const items = [];
    items.push({ description: '', label: 'Run All Unit Tests', type: Type.RunAll });
    items.push({ description: '', label: 'Discover Unit Tests', type: Type.ReDiscover });
    items.push({ description: '', label: 'Run Unit Test Method ...', type: Type.SelectAndRunMethod });
    const summary = getSummary(tests);
    items.push({ description: '', label: 'View Unit Test Output', type: Type.ViewTestOutput, detail: summary });
    if (tests && tests.summary.failures > 0) {
        items.push({ description: '', label: 'Run Failed Tests', type: Type.RunFailed, detail: `${constants.Octicons.Test_Fail} ${tests.summary.failures} Failed` });
    }
    return items;
}
const statusSortPrefix = {};
statusSortPrefix[types_1.TestStatus.Error] = '1';
statusSortPrefix[types_1.TestStatus.Fail] = '2';
statusSortPrefix[types_1.TestStatus.Skipped] = '3';
statusSortPrefix[types_1.TestStatus.Pass] = '4';
function buildItemsForFunctions(rootDirectory, tests, sortBasedOnResults = false, displayStatusIcons = false, debug = false) {
    const functionItems = [];
    tests.forEach(fn => {
        let icon = '';
        if (displayStatusIcons && statusIconMapping.has(fn.testFunction.status)) {
            icon = `${statusIconMapping.get(fn.testFunction.status)} `;
        }
        functionItems.push({
            description: '',
            detail: path.relative(rootDirectory, fn.parentTestFile.fullPath),
            label: icon + fn.testFunction.name,
            type: debug === true ? Type.DebugMethod : Type.RunMethod,
            fn: fn
        });
    });
    functionItems.sort((a, b) => {
        let sortAPrefix = '5-';
        let sortBPrefix = '5-';
        if (sortBasedOnResults) {
            sortAPrefix = statusSortPrefix[a.fn.testFunction.status] ? statusSortPrefix[a.fn.testFunction.status] : sortAPrefix;
            sortBPrefix = statusSortPrefix[b.fn.testFunction.status] ? statusSortPrefix[b.fn.testFunction.status] : sortBPrefix;
        }
        if (sortAPrefix + a.detail + a.label < sortBPrefix + b.detail + b.label) {
            return -1;
        }
        if (sortAPrefix + a.detail + a.label > sortBPrefix + b.detail + b.label) {
            return 1;
        }
        return 0;
    });
    return functionItems;
}
function buildItemsForTestFiles(rootDirectory, testFiles) {
    const fileItems = testFiles.map(testFile => {
        return {
            description: '',
            detail: path.relative(rootDirectory, testFile.fullPath),
            type: Type.RunFile,
            label: path.basename(testFile.fullPath),
            testFile: testFile
        };
    });
    fileItems.sort((a, b) => {
        if (a.detail < b.detail) {
            return -1;
        }
        if (a.detail > b.detail) {
            return 1;
        }
        return 0;
    });
    return fileItems;
}
function onItemSelected(cmdSource, wkspace, selection, debug) {
    if (!selection || typeof selection.type !== 'number') {
        return;
    }
    let cmd = '';
    // tslint:disable-next-line:no-any
    const args = [undefined, cmdSource, wkspace];
    switch (selection.type) {
        case Type.Null: {
            return;
        }
        case Type.RunAll: {
            cmd = constants.Commands.Tests_Run;
            break;
        }
        case Type.ReDiscover: {
            cmd = constants.Commands.Tests_Discover;
            break;
        }
        case Type.ViewTestOutput: {
            cmd = constants.Commands.Tests_ViewOutput;
            break;
        }
        case Type.RunFailed: {
            cmd = constants.Commands.Tests_Run_Failed;
            break;
        }
        case Type.SelectAndRunMethod: {
            cmd = debug ? constants.Commands.Tests_Select_And_Debug_Method : constants.Commands.Tests_Select_And_Run_Method;
            break;
        }
        case Type.RunMethod: {
            cmd = constants.Commands.Tests_Run;
            // tslint:disable-next-line:prefer-type-cast no-object-literal-type-assertion
            args.push({ testFunction: [selection.fn.testFunction] });
            break;
        }
        case Type.DebugMethod: {
            cmd = constants.Commands.Tests_Debug;
            // tslint:disable-next-line:prefer-type-cast no-object-literal-type-assertion
            args.push({ testFunction: [selection.fn.testFunction] });
            args.push(true);
            break;
        }
        default: {
            return;
        }
    }
    vscode_1.commands.executeCommand(cmd, ...args);
}
//# sourceMappingURL=picker.js.map
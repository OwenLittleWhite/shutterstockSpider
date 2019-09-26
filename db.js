const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'db.json')
// 初始化db.json文件
function init() {
    let isExist = fs.existsSync(dbPath);
    if (!isExist) {
        fs.writeFileSync(dbPath, '{}')
    }
}
init()
/**
 * 判断哪个tag下的哪一页是否处理过了
 * @param {*} tag 
 * @param {*} page 
 */
function isProcess(tag, page) {
    let dbData = JSON.parse(fs.readFileSync(dbPath).toString())
    return dbData[tag] && (dbData[tag].indexOf(page) > -1)

}
/**
 * 标记已处理过的
 */
function markProcess(tag, page) {
    let dbData = JSON.parse(fs.readFileSync(dbPath).toString());
    if (dbData[tag]) {
        dbData[tag].push(page)
    } else {
        dbData[tag] = [page]
    }
    fs.writeFileSync(dbPath, JSON.stringify(dbData))
}

module.exports = {
    isProcess,
    markProcess
}
const targets = [
    { tag: "travel", url: "https://www.shutterstock.com/zh/search/travel?mreleased=true&gender=female&age=20s&number_of_people=1", page: 7458 }, // page: 7458
    { tag: "outdoor", url: "https://www.shutterstock.com/zh/search/outdoor+activities?mreleased=true&gender=female&age=20s&number_of_people=1", page: 3495 }, // page: 3495
    { tag: "summer", url: "https://www.shutterstock.com/zh/search/summer+holidays?mreleased=true&age=20s&number_of_people=1&gender=female", page: 4102 }, // page: 4102
    { tag: "lifestyles", url: "https://www.shutterstock.com/zh/search/lifestyles?mreleased=true&age=20s&number_of_people=1&gender=female", page: 35063 }] //page: 35063
const rp = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');
const uuid = require('uuid');
const db = require('./db')
const headers = {
    "user-agent": "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.75 Safari/537.36"
}
const path = require('path');
const picPath = path.join(__dirname, 'pic')
/** 通过页面的url获取所有图片的地址 */
async function getImgUrlsByPage(url) {
    let res = await rp({
        uri: url,
        headers
    })
    let $ = cheerio.load(res);
    let jsonStr = $('script').attr({ 'data-react-helmet': 'true', type: "application/ld+json" })[5].childNodes[0].data;
    let data = JSON.parse(jsonStr);
    let imgUrls = []
    data.forEach(i => {
        if (i.fileFormat === "image/jpeg") {
            let imgUrl = i.thumbnail;
            // 去除水印
            // https://image.shutterstock.com/image-photo/pretty-young-female-tourist-studying-260nw-98831906.jpg
            imgUrl = imgUrl.split('-');
            let temp = imgUrl[imgUrl.length - 2];
            temp = parseInt(temp) - 10 + 'nw';
            imgUrl[imgUrl.length - 2] = temp;
            imgUrl = imgUrl.join('-');
            imgUrls.push(imgUrl)
        }
    })
    return imgUrls
}
function sleep(n) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(0)
        }, n);
    })
}
/**
 * 下载图片
 * @param {String} onlinePath 网络上的图片路径
 * @param {String} directDir 要下载到哪个目的文件夹
 */
function downLoadPics(onlinePath, directDir) {
    return new Promise((resolve, reject) => {
        try {
            let directPath = path.join(directDir, `${uuid()}.jpg`)
            let writeStream = fs.createWriteStream(directPath);
            let readStream = rp(onlinePath, {
                method: 'get',
                timeout: 60000
            })
            readStream.pipe(writeStream);
            readStream.on('error', function (error) {
                console.log('error on readstream', error)
                writeStream.end();
                writeStream.close();
                fs.unlinkSync(directPath);
                reject(error)
            })
            readStream.on('complete', function () {
                writeStream.end();
                resolve(0)
            })
            writeStream.on('close', function () {
                writeStream.end();
                resolve(0)
            })
        } catch (error) {
            reject(error)
        }
    })
}

async function processOneTarget(target) {
    let { tag, url, page } = target;
    // 生成图片存放的目录
    let dir = path.join(picPath, tag);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
    }
    for (let i = 1; i <= page; i++) {
        console.log(new Date(), `正在处理tag:${tag},第${i}页...`)
        if (db.isProcess(tag, i)) {
            continue;
        }
        let _url = (url + `&page=${i}`);
        await sleep(1000);
        try {
            let imgUrls = await getImgUrlsByPage(_url);
            console.log('已经获取url')
            db.markProcess(tag, i);
            await Promise.all(imgUrls.map(i => downLoadPics(i, dir)));
        } catch (error) {
            console.error(new Date(), `爬取${tag},第${i}页时出现异常`, error);
        }

    }

}

async function main() {
    if (!fs.existsSync(picPath)) {
        fs.mkdirSync(picPath)
    }
    for (let i = 0; i < targets.length; i++) {
        await processOneTarget(targets[i])
    }
}
main()
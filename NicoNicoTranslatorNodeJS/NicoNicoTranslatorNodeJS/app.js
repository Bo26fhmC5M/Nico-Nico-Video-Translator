"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmpty = isEmpty;
const dns = require('dns');
var https = require('https');
var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');
var app = express();
var request = require('request');
var PapagoTranslator = require('./PapagoTranslator');
var version = '1.8';
var ip = '255.255.255.255';
function isEmpty(text) {
    return text == null || text.match(/^\s*$/) !== null;
} //https://www.nicovideo.jp/watch/sm26561659
app.use(bodyParser.json());
app.use(bodyParser.text());
console.log('');
console.log('NicoNicoTranslator (' + version + '-nodejs)');
console.log('오류 제보 : https://github.com/009342/Nico-Nico-Video-Translator/issues');
console.log('제작자 블로그 : http://sshbrain.tistory.com');
console.log('');
dns.resolve('public.nvcomment.nicovideo.jp', (err, result) => {
    if (err) {
        console.log('public.nvcomment.nicovideo.jp의 IP주소를 가져오는데 실패하였습니다.');
        console.error(`에러: ${err}`);
    }
    else {
        console.log('public.nvcomment.nicovideo.jp : ' + result);
        ip = result[0];
    }
});
function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}
if (!(fs.existsSync("./cert/private.key") && fs.existsSync("./cert/cert.crt"))) {
    console.error('인증서가 존재하지 않습니다.');
}
else {
    https.createServer({ key: fs.readFileSync("./cert/private.key"), cert: fs.readFileSync("./cert/cert.crt") }, app).listen(443, function () {
        console.log("HTTPS 서버가 작동 중입니다.");
    });
    app.use(function (req, res, next) {
        res.header('Access-Control-Allow-Origin', 'https://www.nicovideo.jp');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
        res.header('Access-Control-Allow-Headers', '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Vary', 'Origin');
        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }
        next();
    });
    app.post('/v1/threads', function (req, res) {
        res.setHeader('Content-Type', 'application/json');
        try {
            var requestBody;
            if (typeof req.body === 'string') {
                requestBody = JSON.parse(req.body);
            }
            else {
                requestBody = req.body;
            }
            var options = {
                url: `https://${ip}/v1/threads?pc=1`,
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=UTF-8',
                    'x-client-os-type': 'others',
                    'x-frontend-id': '6',
                    'x-frontend-version': '0',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0',
                    'Referer': 'https://www.nicovideo.jp/',
                    'Origin': 'https://www.nicovideo.jp',
                    'Host': 'public.nvcomment.nicovideo.jp'
                },
                body: JSON.stringify(requestBody),
                strictSSL: false
            };
            request(options, function (error, response, body) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (error) {
                        console.error('API 요청 실패:', error);
                        res.status(500).json({ error: 'API 요청 실패' });
                        return;
                    }
                    if (response.statusCode !== 200) {
                        res.status(response.statusCode).send(body);
                        return;
                    }
                    try {
                        var jsonbody = JSON.parse(body);
                        if (jsonbody.data && jsonbody.data.threads) {
                            for (var thread of jsonbody.data.threads) {
                                if (thread.comments && thread.comments.length > 0) {
                                    var chats = [];
                                    var page = [[]];
                                    for (var comment of thread.comments) {
                                        if (comment.body && !isEmpty(comment.body)) {
                                            var str = comment.body.replace(/\n/g, "\u21B5");
                                            if (!isEmpty(str))
                                                chats.push(str);
                                        }
                                    }
                                    var count = 0;
                                    var pagecount = 0;
                                    while (true) {
                                        for (var strlength = 0; strlength < 3000 && count != chats.length;) {
                                            strlength += (chats[count] + "\r\n").length;
                                            page[pagecount].push(chats[count++]);
                                        }
                                        if (count == chats.length) {
                                            break;
                                        }
                                        else {
                                            page.push([]);
                                            page[pagecount + 1].push(page[pagecount].pop());
                                            pagecount++;
                                        }
                                    }
                                    var result = "";
                                    count = 0;
                                    for (var c = 0; c < page.length; c++) {
                                        var temp = "";
                                        for (var k = 0; k < page[c].length; k++) {
                                            temp += page[c][k] += "\r\n";
                                            count++;
                                        }
                                        if (c != 0)
                                            yield sleep(2000);
                                        result += (yield PapagoTranslator('ja', 'ko', temp, 'n2mt')) + "\r\n";
                                        console.log(count + "/" + chats.length + "완료");
                                    }
                                    var results = result.split(/\r?\n/);
                                    var resultIndex = 0;
                                    for (var comment of thread.comments) {
                                        if (comment.body && !isEmpty(comment.body)) {
                                            comment.body = results[resultIndex++].replace(/\u21B5/g, "\n");
                                        }
                                    }
                                }
                            }
                        }
                        res.json(jsonbody);
                    }
                    catch (parseError) {
                        console.error('JSON 파싱 실패:', parseError);
                        res.status(500).json({ error: 'JSON 파싱 실패' });
                    }
                });
            });
        }
        catch (requestError) {
            console.error('요청 처리 실패:', requestError);
            res.status(400).json({ error: '요청 처리 실패' });
        }
    });
}
//# sourceMappingURL=app.js.map
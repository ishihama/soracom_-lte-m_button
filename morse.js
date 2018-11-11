const https = require('https');
const url = require('url');
const fs = require('fs');

const defaultSlackUrl = process.env['SLACK_URL']
const tmpFilePath = "/tmp/morse_signal.txt"
const getSignal = {
    "SINGLE": ".", // トン
    "DOUBLE": " ", // デリミタ
    "LONG": "-" // ツー
}

const wabunMorseCode = {
    ".-": "イ",
    ".-.-": "ロ",
    "-...": "ハ",
    "-.-.": "ニ",
    "-..": "ホ",
    ".": "ヘ",
    "..-..": "ト",
    "..-.": "チ",
    "--.": "リ",
    "....": "ヌ",
    "-.--.": "ル",
    ".---": "ヲ",
    "-.-": "ワ",
    ".-..": "カ",
    "--": "ヨ",
    "-.": "タ",
    "---": "レ",
    "---.": "ソ",
    ".--.": "ツ",
    "--.-": "ネ",
    ".-.": "ナ",
    "...": "ラ",
    "-": "ム",
    "..-": "ウ",
    ".-..-": "ヰ",
    "..--": "ノ",
    ".-...": "オ",
    "...-": "ク",
    ".--": "ヤ",
    "-..-": "マ",
    "-.--": "ケ",
    "--..": "フ",
    "----": "コ",
    "-.---": "エ",
    ".-.--": "テ",
    "--.--": "ア",
    "-.-.-": "サ",
    "-.-..": "キ",
    "-..--": "ユ",
    "-...-": "メ",
    "..-.-": "ミ",
    "--.-.": "シ",
    ".--..": "ヱ",
    "--..-": "ヒ",
    "-..-.": "モ",
    ".---.": "セ",
    "---.-": "ス",
    ".-.-.": "ン",
    "..": "゛",
    "..--.": "゜"
}

const writeSignal = (signal) => {
    console.log(signal);
    fs.appendFileSync(tmpFilePath, signal);
}

const readSignal = () => {
    return fs.readFileSync(tmpFilePath, 'utf8');
}

const decodeWabunMorseCode = (signal) => {
    return wabunMorseCode[signal] ? wabunMorseCode[signal] : "?" // デコードできない場合は?を返す
}

const sendSlack = (event, context, callback, message) => {
    var slackUrl = (event.placementInfo.attributes.slackUrl) ? event.placementInfo.attributes.slackUrl : defaultSlackUrl
    if (!slackUrl) {

    }
    var slackReqOptions = url.parse(slackUrl);
    slackReqOptions.method = 'POST';
    slackReqOptions.headers = { 'Content-Type': 'application/json' };

    var payload = { 'text': message }

    if (event.placementInfo.attributes.username) {
        payload.username = event.placementInfo.attributes.username;
    }
    if (event.placementInfo.attributes.iconEmoji) {
        payload.icon_emoji = event.placementInfo.attributes.iconEmoji;
    }
    if (event.placementInfo.attributes.iconUrl) {
        payload.icon_url = event.placementInfo.attributes.iconUrl;
        payload.as_user = false;
    }
    if (event.placementInfo.attributes.slackChannel) {
        payload.channel = event.placementInfo.attributes.slackChannel;
    }
    var body = JSON.stringify(payload);
    slackReqOptions.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
    };
    var req = https.request(slackReqOptions, function(res) {
        if (res.statusCode === 200) {
            console.log('Posted to slack');
            callback(null, { "result": "ok" });
        }
        else {
            callback(false, { "result": "ng", "reason": 'Failed to post slack ' + res.statusCode })
        }
        return res;
    });
    req.write(body)
    req.end();
}

exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    writeSignal(getSignal[event.deviceEvent.buttonClicked.clickType]);
    const singals = readSignal();
    console.log("\"" + singals + "\"");

    // デリミタが連続で来たらメッセージ送信
    if (singals.match(/.+  $/)) {
        var message = singals.split(" ").map(function(signal) {
            console.log("signal: " + signal);
            if (signal === "") { // デリミタのみを無視
                return "";
            }
            else {
                return decodeWabunMorseCode(signal)
                // return wabun_morse[signal];
            }
        });
        // console.log(message.join(""));
        sendSlack(event, context, callback, message.join(""));
        fs.unlinkSync(tmpFilePath);
    }
};

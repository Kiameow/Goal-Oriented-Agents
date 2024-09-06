import request from "request";
import dotenv from "dotenv";
import { syserror, syslog } from "../../logger.mjs";

async function sendQuery(prompt) {
    var options = {
        'method': 'POST',
        'url': 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie-speed-128k?access_token=' + await getAccessToken(),
        'headers': {
                'Content-Type': 'application/json'
        },
        body: JSON.stringify({
                "messages": [
                        {
                                "role": "user",
                                "content": prompt
                        }
                ]
        })
    };

    return new Promise((resolve, reject) => {
        request(options, (error, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(JSON.parse(response.body));
            }
        });
    });
}

async function sendQuerySafely(prompt, fallBackMessage, maxRetries=5, verbose=false) {

    if (verbose) {
        syslog(`Sending query: ${prompt}`);
        for (let attempts = 1; attempts <= 5; attempts++) {
            let timestamp = new Date().toISOString();
            try {
                const result = await sendQuery(prompt);
                if (result.error_msg) {
                    throw new Error(result.error_msg);
                }
                syslog(`${timestamp}: Attempt ${attempts} succeeded:`);
                syslog(result);
                return result; // result is an object, the body part of the response 
            } catch (e) {
                syserror(`${timestamp}: Attempt ${attempts} failed: ${e}`);
                if (attempts >= maxRetries) {
                    return {
                        "error_msg": e,
                        "result": "<##FLAG##>" + fallBackMessage + "<##FLAG##>"
                    }
                }
            }
        }
    }

    for (let attempts = 1; attempts <= 5; attempts++) {
        try {
            const result = await sendQuery(prompt);
            return result;
        } catch (e) {
            if (attempts >= maxRetries) {
                return fallBackMessage;
            }
        }
    }
}

/**
 * 使用 AK，SK 生成鉴权签名（Access Token）
 * @return string 鉴权签名信息（Access Token）
 */
function getAccessToken() {
    dotenv.config();
    const { AK, SK } = process.env;

    let options = {
        'method': 'POST',
        'url': 'https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=' + AK + '&client_secret=' + SK,
    }
    return new Promise((resolve, reject) => {
        request(options, (error, response) => {
            if (error) { reject(error) }
            else { resolve(JSON.parse(response.body).access_token) }
        })
    })
}

export {sendQuery, sendQuerySafely };



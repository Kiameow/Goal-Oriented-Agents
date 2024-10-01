import request from "request";
import dotenv from "dotenv";
import { syserror, syshttp, sysinfo, sysverbose, syswarn } from "../../logger.mjs";
import { extractContentBetweenFlags, isJSON } from "../../helper.mjs";

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
                                "content": prompt,
                                "penalty_score": 2.0
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

async function sendQuerySafely(prompt, fallBackMessage, maxRetries=5) {
    sysverbose(`Sending query: ${prompt}`);
    for (let attempts = 1; attempts <= 5; attempts++) {
        const startTime = Date.now();
        let timestamp = new Date().toISOString();
        try {
            const result = await sendQuery(prompt);
            if (result.error_msg) {
                throw new Error(result.error_msg);
            }
            sysinfo(`${timestamp}: Attempt ${attempts} succeeded`);
            syshttp(result);
            return result; // result is an object, the body part of the response 
        } catch (e) {
            syswarn(`${timestamp}: Attempt ${attempts} failed: ${e}`);
            if (attempts >= maxRetries) {
                return {
                    "error_msg": e,
                    "result": "<##FLAG##>" + fallBackMessage + "<##FLAG##>"
                }
            }
        }
        const endTime = Date.now();
        const elapsedTime = (endTime - startTime) / 1000;
        sysinfo(`http request elapsed time: ${elapsedTime} seconds`);
    }
}

async function sendQueryWithValidation(prompt, validateFn, expectJson=true) {
    let result = null;
    let retryCount = 0;
    
    do {
        if (retryCount > 0) {
            syswarn(`Retrying for ${retryCount} attempts: ${validateFn.name}`);
        }
        // Send the query and get the response
        const response = await sendQuerySafely(prompt, null);
        let resultStr = response.result;

        // Extract content between flags and JSON code block
        resultStr = extractContentBetweenFlags(resultStr, "<##FLAG##>");
        resultStr = extractContentBetweenFlags(resultStr, "```json", "```");
        
        if (expectJson) {
            // Check if resultStr is not empty and valid JSON
            if (resultStr && isJSON(resultStr)) {
                result = JSON.parse(resultStr);
            } else {
                syswarn(`Invalid JSON response: ${resultStr}`);
            }
        } else {
            result = resultStr;
        }

        retryCount++;
        
    } while (!result || !validateFn(result)); // Use the provided validation function

    return result;
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

export {sendQuery, sendQuerySafely, sendQueryWithValidation };



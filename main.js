//安装包：npm install qianfan
import { ChatCompletion, setEnvVariable } from "@baiducloud/qianfan";
setEnvVariable("QIANFAN_AK", "tycSiflHALvv7PufZjw9ZtMh");
setEnvVariable("QIANFAN_SK", "xb7SVTX2cTVWbnNNoP75IsVYBh21AubG");

const client = new ChatCompletion({ Endpoint: "ERNIE-Speed-128K" });
async function main() {
  const resp = await client.chat({
    messages: [
      {
        role: "user",
        content: "How's you doing?",
      }
    ],
  });
  console.log(resp);
}
main();

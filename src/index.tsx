import {
  Context,
  h,
  Schema,
  Logger,
  sleep,
} from "koishi";
import { Util } from "./util";
// 对于整体依赖的服务，使用 inject 属性声明依赖关系
export const inject = {
  required: ["database"],
};
export const name = "ning";
export const usage = "凝的实现插件";
// 配置项
// export interface Config {
//   General: object;
// }
export const Config = Schema.object({
  debug: Schema.boolean().default(false).description("Debug 模式"),
  delay: Schema.number().default(3000).description("回复延迟"),
  aichat: Schema.object({
    cf_token: Schema.string().description("Cloudflare worker AI API token"),
  }).description("AI 对话"),
});

//
declare module "koishi" {
  interface Events {
    notice(session: Session): void; // 兼容onebot
  }
  interface Session {
    targetId: string; // 兼容onebot
  }

  // 定义 `Likes` 表的结构和类型
  interface Tables {
    qqLike: {
      userId: string;
      date: Date;
    };
  }
}

let ctx: Context; // 定义为模块级别变量
let log: Logger;
let util: Util; // 实例化工具类
export function apply(context: Context) {
  // 赋值
  ctx = context;
  log = ctx.logger(name);
  log.info("开始加载")
  // 
  util = new Util(ctx, log);
  //  
  log.info("注册命令与监听事件")
  // 注册命令
  ctx.command("赞我").action(async ({ session }) => {
    util.qqlike(session);
  });
  ctx
    .command("撤回 [count:number]", { authority: 0, captureQuote: false })
    .action(({ session }, count = 1) => {
      util.recall(session, count)
    });
  ctx.command("echo <message>").action((_, message) => message);

  // 监听文本消息
  ctx.on("message", async (session) => {
    if (session.content === "随机图片") {
      session.send(h("img", { src: "https://t.alcy.cc/moemp" }));
    }

    if (session.content === "凝") {
      session.send("叫我干嘛？");
    }

    if (session.content === "你好") {
      session.send(
        <>
          <img src="https://mirror.ghproxy.com/https://github.com/NuoFang6/Ning/raw/master/img/甘城探头.webp" />
        </>,
      );
    }
    if (session.content === "test") { session.send(<>?<br />!</>) }
  });

  // 监听互动消息
  ctx.on("notice", async (session) => {
    if (session.subtype == "poke" && session.targetId == session.selfId) {
      session.send(
        <>
          {"别摸了，给你点赞还不行吗 (*/ω＼*)"}
        </>,
      );
      await sleep(500); // 毫秒
      util.qqlike(session);
    }
  });
  // 
  log.info("加载完成")
}

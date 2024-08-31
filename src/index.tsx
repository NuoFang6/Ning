import {
  Context,
  h,
  Schema,
  Session,
  Logger,
  sleep,
  remove,
  Dict,
} from "koishi";
import { init, qqlike, recall } from "./utils";

// 对于整体依赖的服务，使用 inject 属性声明依赖关系
export const inject = {
  required: ["database"],
};

export const name = "ning";

let log = new Logger(name);

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

declare module "koishi" {
  interface Events {
    notice(session: Session): void; // 兼容onebot
  }

  interface Session {
    targetId: string; // 兼容onebot
  }
}

export function apply(ctx: Context) {
  init(ctx, log);
  // 注册命令
  ctx.command("赞我").action(async ({ session }) => {
    qqlike(session);
  });

  ctx.command("echo <message>").action((_, message) => message);

  // 撤回消息
  // const ctxG = ctx.guild();
  // console.info(ctxG);
  // console.info(ctx);
  const recent: Dict<string[]> = {};
  ctx.on("message-created", (session) => {
    // 检查消息是否是由自己发送的
    if (session.author.user) return;
    console.info("Send event triggered");
    // 在 JavaScript 中，数组和对象都是通过引用传递的,不是一个副本,修改会直接反映
    const list = (recent[session.channelId] ||= []);
    list.unshift(session.messageId);
    list.forEach((item, index) => {
      console.log(`Message ID ${index + 1}:`, item);
    });
    // ctx.setTimeout(() => remove(list, session.messageId), 300000); // 保留5分钟记消息id记录
  });
  ctx
    .command("recall [count:number]", { authority: 0, captureQuote: false })
    .action(({ session }, count = 1) => {
      console.info("撤回消息" + session.channelId + count);
      const list = recent[session.channelId];
      if (list && list.length > 0) {
        list.forEach((item, index) => {
          console.log(`Message ID ${index + 1}:`, item);
        });
      } else {
        console.warn(`No messages found for channel ID: ${session.channelId}`);
      }
      recall(session, recent, count);
    });

  // 文本消息回应
  ctx.on("message", async (session) => {
    if (session.content === "随机图片") {
      session.send(h("img", { src: "https://t.alcy.cc/moemp" }));
    }

    if (session.content === "凝") {
      session.send("叫我干嘛？");
    }

    if (session.content === "test") {
      session.send(
        <>
          <img src="https://mirror.ghproxy.com/https://github.com/NuoFang6/Ning/raw/master/img/甘城探头.webp" />
        </>,
      );
    }
  });

  // 互动消息回应
  ctx.on("notice", async (session) => {
    if (session.subtype == "poke" && session.targetId == session.selfId) {
      session.send(
        <>
          <img src="https://mirror.ghproxy.com/https://github.com/NuoFang6/Ning/raw/master/img/甘城探头.webp" />
        </>,
      );
      await sleep(800); // 毫秒
      qqlike(session);
    }
  });
}

// utils.ts
import {
  Bot,
  Context,
  Dict,
  h,
  Logger,
  remove,
  Schema,
  Session,
  sleep,
} from "koishi";
import { 甘城爱心 } from "./img/imgbase64";

// 接收上下文
let ctx: Context;
let log: Logger;
export function init(globalCtx: Context, logger: Logger) {
  ctx = globalCtx;
  log = logger;
}

// 点赞函数
// 定义 `Likes` 表的结构和类型
declare module "koishi" {
  interface Tables {
    qqLike: {
      userId: string;
      date: Date;
    };
  }
}
export async function qqlike(session: Session) {
  // 初始化数据表
  try {
    // 尝试查询表中的一条记录，检测表是否存在
    await ctx.database.get("qqLike", {});
    // 如果没有抛出错误，说明表已经存在
    log.info("检测到 qqLike 数据表存在");
  } catch (error) {
    // 表不存在或查询失败，说明表需要创建
    log.warn("检测到 qqLike 数据表不存在，创建中");
    ctx.model.extend(
      "qqLike",
      {
        userId: "string", // 用户 ID
        date: "timestamp", // 点赞日期时间
      },
      {
        primary: "userId", // 主键
        autoInc: false,
      },
    );
  }

  // 获取当前日期
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 设置时间为当天的00:00:00
  // 查询当日的点赞记录
  const existingLike = await ctx.database.get("qqLike", {
    userId: session.userId,
    date: { $gte: today }, // 查找当天的记录
  });
  // 如果已经存在记录，则拒绝再次点赞
  if (existingLike.length > 0) {
    session.send(
      <>
        <at id={session.userId} /> 凝今天已经为你点过赞了，明天再来吧！
      </>,
    );
    return;
  }

  let n = 0;
  try {
    for (let i = 0; i < 5; i++) {
      await session.bot.internal.sendLike(session.userId, 10);
      n = (i + 1) * 10;
    }
    session.send(
      <>
        <at id={session.userId} /> 凝尝试为你点了 {n} 个赞{"\n"}
        <img src={甘城爱心} />
      </>,
    );

    // 点赞成功后，插入记录到数据库中
    await ctx.database.upsert("qqLike", () => [
      {
        userId: session.userId,
        date: new Date(), // 记录点赞的日期时间
      },
    ]);
  } catch (error) {
    if (n > 0) {
      session.send(
        <>
          <at id={session.userId} /> 你是凝的好友，凝为你点了 {n} 个赞
        </>,
      );
      // 即使出现错误，也尝试保存已成功的点赞记录
      await ctx.database.upsert("qqLike", () => [
        {
          userId: session.userId,
          date: new Date(), // 记录点赞的日期时间
        },
      ]);
    } else {
      log.warn("点赞时出现错误：" + error.toString());
      session.send(
        <>
          <at id={session.userId} />
          {"\n"}很抱歉，我似乎无法为您点赞。{"\n"}
          {error.toString()}）
        </>,
      );
      await ctx.database.upsert("qqLike", () => [
        {
          userId: session.userId,
          date: new Date(), // 记录点赞的日期时间
        },
      ]);
    }
  }
}

// 撤回消息
export async function recall(session: Session, recent, count) {
  const list = recent[session.channelId];
  // 回复消息调用时尝试撤回被引用的消息
  if (session.quote) {
    const index = list?.findIndex((id) => id === session.quote.id);
    if (index) list.splice(index, 1);
    await deleteMessage(session.bot, session.channelId, session.quote.id);
    return;
  }
  // 检查消息列表是否存在
  if (!list) return session.send("无可撤回的消息。"); // 直接 return，否则可能会继续执行后续代码
  // 检出需要撤回的消息
  const removal = list.splice(0, count);
  // 延迟撤回动作防止风控
  // const delay = ctx.root.config.delay.broadcast;
  const delay = 500; //ms
  // 如果 list 在移除 count 条消息后为空（即没有剩余的消息 ID），则删除 recent 字典中对应 session.channelId 的条目
  if (!list.length) delete recent[session.channelId];
  // 循环遍历 removal 列表中的每条消息 ID，依次撤回
  for (let index = 0; index < removal.length; index++) {
    if (index && delay) await sleep(delay);
    await deleteMessage(session.bot, session.channelId, removal[index]);
  }
}
async function deleteMessage(bot: Bot, channelId: string, messageId: string) {
  try {
    await bot.deleteMessage(channelId, messageId);
    log.debug("撤回消息：" + messageId + " 在 " + channelId);
  } catch (error) {
    log.warn("撤回消息出错：" + error);
  }
}

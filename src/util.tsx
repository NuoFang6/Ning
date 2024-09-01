import { Session, sleep, Logger, Bot, Context, Dict } from "koishi";
export class Util {
  // 定义变量
  private ctx: Context;
  private Gctx: Context;
  private log: Logger;
  private recent: Dict<string[]> = {};
  // 构造函数
  constructor(context: Context, logger: Logger) {
    // 赋值
    this.ctx = context;// ctx 是传递进来的，是同一个
    this.Gctx = this.ctx.guild()
    this.log = logger
    // 
    this.registerEvents();  // 注册事件监听器
    this.log.info("Util 对象创建完成");
  }
  registerEvents() {
    this.ctx.on('send', (session) => {
      this.log.info("触发 send 事件，内容：" + session.content)
      const list = this.recent[session.channelId] ||= [];
      list.unshift(session.messageId);
      this.log.debug("新增消息id：" + session.messageId + "用户：" + session.author.id + "列表：" + list.toString())
    });
  }

  async deleteMessage(bot: Bot, channelId: string, messageId: string) {
    try {
      await bot.deleteMessage(channelId, messageId);
      this.log.info(<>撤回消息：{messageId} 在 {channelId} 频道 </>);
    } catch (error) {
      this.log.warn("撤回消息出错：" + error);
    }
  }

  async recall(session: Session, count: number) { // 沙盒中无法使用
    // 获取当前频道的消息 ID 列表
    const list = this.recent[session.channelId];
    // 如果消息是一个引用消息（即 session.quote 存在）
    if (session.quote) {
      // 查找引用消息的 ID 在列表中的索引
      const index = list?.findIndex(id => id === session.quote.id);

      // 如果找到索引 (index !== -1)，则从列表中移除该消息 ID
      if (index !== -1) list.splice(index, 1);

      // 删除引用消息
      await this.deleteMessage(session.bot, session.channelId, session.quote.id);
      return; // 处理完引用消息后退出函数
    }

    // 如果没有找到任何消息 ID 列表，则返回 'no-recent' 消息
    if (!list) {
      session.send(<>唉？我之前发了什么<br />（出错啦：无消息ID列表）</>);
      this.log.warn(<>Error：无消息ID列表：{list}</>);
      return;
    };

    // 从列表中移除前 count 个消息 ID
    const removal = list.splice(0, count);

    // 如果列表为空，删除频道的消息 ID 记录
    if (!list.length) delete this.recent[session.channelId];

    // 遍历移除的消息 ID 列表
    for (let index = 0; index < removal.length; index++) {
      // 如果不是第一个消息并且配置了延迟时间，则等待指定的延迟时间
      await sleep(550);

      // 删除消息并记录日志
      await this.deleteMessage(session.bot, session.channelId, removal[index]);
    }
  }

  async qqlike(session: Session) {
    // 初始化数据表
    try {
      // 尝试查询表中的一条记录，检测表是否存在
      await this.ctx.database.get("qqLike", {});
      // 如果没有抛出错误，说明表已经存在
      this.log.debug("检测到 qqLike 数据表存在");
    } catch (error) {
      // 表不存在或查询失败，说明表需要创建
      this.log.info("检测到 qqLike 数据表不存在，创建中");
      this.ctx.model.extend(
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
    const existingLike = await this.ctx.database.get("qqLike", {
      userId: session.userId,
      date: { $gte: today }, // 查找当天的记录
    });
    // 如果已经存在记录，则拒绝再次点赞
    if (existingLike.length > 0) {
      session.send(
        <>
          <at id={session.userId} /> 凝今天已经为你点过赞了，明天再来吧！<br />
          <img src="https://mirror.ghproxy.com/https://github.com/NuoFang6/Ning/raw/master/img/甘城盯张嘴.webp" />
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
          <img src="https://mirror.ghproxy.com/https://github.com/NuoFang6/Ning/raw/master/img/甘城抱爱心.webp" />
        </>,
      );

      // 点赞成功后，插入记录到数据库中
      await this.ctx.database.upsert("qqLike", () => [
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
        await this.ctx.database.upsert("qqLike", () => [
          {
            userId: session.userId,
            date: new Date(), // 记录点赞的日期时间
          },
        ]);
      } else {
        this.log.warn("点赞时出现错误：" + error.toString());
        session.send(
          <>
            <at id={session.userId} /><br />
            很抱歉，点赞失败了<br />
            （{error.toString()}）
          </>,
        );
        await this.ctx.database.upsert("qqLike", () => [
          {
            userId: session.userId,
            date: new Date(), // 记录点赞的日期时间
          },
        ]);
      }
    }
  }

  async test(session: Session) {
    session.send("叫我干嘛？");
  }
}

const genshin_nick_map: Record<string, string[]> = {
  神里绫华: ['ayaka', '绫华', '冰骗骗花', 'shenli', 'linghua'],
  胡桃: ['堂主', 'hutao', 'whotao'],
  雷电将军: ['雷军', '影', '煮饭婆', 'shogun', 'ei'],
  烟绯: ['罗老师', '罗翔', 'yanfei'],
  优菈: ['最终用户许可协议', 'eula', 'youla'],
  温迪: ['venti', '巴巴托斯', '巴托巴斯', '诶嘿', '卖唱的', 'barbatos'],
  芭芭拉: ['内鬼', 'babala', 'barbara'],
  行秋: ['6星水神', '乐子人', '枕玉老师', 'xingqiu', 'hangqiu'],
  迪奥娜: ['猫娘', '猫猫', '猫', 'DIO娜', 'diona'],
  菲谢尔: ['皇女', '小艾咪', '奥兹发射器', 'fischl', 'oz'],
  琴: ['团长', '蒙德砍王', 'qing', 'jean'],
  雷泽: ['狼崽子', '替身使者', 'leize', 'razor'],
  旅行者: ['女主', '男主', '空', '荧', 'lumine', 'aether', '爷', '👴'],
  甘雨: ['椰羊', '甘羊', '王小美', 'ganyu', 'cocogoat', 'goat'],
  魈: ['降魔大圣', 'xiao', '1m6'],
  可莉: ['火花骑士', '火化骑士', 'klee'],
  阿贝多: ['小王子', 'npc', 'albedo'],
  刻晴: ['刻师傅', '牛杂师傅', '氪晴', '阿晴', '金丝虾球真君', 'keqing'],
  枫原万叶: ['万叶', '叶天帝', 'kazuha', 'vanyeah'],
  珊瑚宫心海: ['心海', '心海海', '观赏鱼', 'kokomi'],
  砂糖: ['雷萤术士', 'sucrose', 'C6H12O6', '碳水化合物'],
  香菱: ['xiangling'],
  钟离: ['未来可期', 'zhongli', 'morax', 'geodaddy'],
  安柏: ['蒙徳第一火弓', '打火机', 'amber'],
  丽莎: ['lisa'],
  五郎: ['狗狗', '希娜小姐', 'hina', 'gorou'],
  七七: ['救苦度厄真君', '肚饿真君', 'qiqi', '77'],
  罗莎莉亚: ['白色史莱姆', 'rosaria'],
  九条裟罗: ['九条', '外置暴伤头', 'sara'],
  早柚: ['狸猫', '貉', '柚岩龙蜥', 'sayu'],
  诺艾尔: ['高达', '女仆', 'noelle'],
  班尼特: ['6星', '点赞哥', 'bennett'],
  云堇: ['yunjin'],
  申鹤: ['shenhe'],
  荒泷一斗: ['岩丘丘萨满', '一斗', '榜一大哥', 'itto'],
  托马: ['地头蛇', 'thoma'],
  埃洛伊: ['aloy'],
  宵宫: ['yoimiya'],
  辛焱: ['xinyan'],
  迪卢克: ['卢老爷', '老爷', '正义人', '正E人', '卢锅巴', '卢卢伯爵', 'diluc'],
  凝光: ['群玉阁', '富婆', 'ningguang', 'geomommy'],
  重云: ['chongyun'],
  达达利亚: ['公子', '钱包', '达达鸭', '鸭鸭', '阿贾克斯', 'childe', 'tartaglia', 'ajax'],
  北斗: ['船长', '龙王', '大姐头', 'beidou'],
  莫娜: ['半部讨龙真君', 'mona', '阿斯托洛吉斯·莫娜·梅姬斯图斯'],
  凯亚: ['矿工头子', 'kaeya'],
  八重神子: ['八重狐狸', '神子', 'yae', 'miko'],
}

export function get_genshin_character_name(nick: string) {
  for (const [name, nicks] of Object.entries(genshin_nick_map)) {
    if (nicks.includes(nick) || nick === name) {
      return name
    }
  }

  return null
}

import { Request, Response } from 'express'
import { Telegraf } from 'telegraf'

declare global {
  type CommandHandler = Telegraf['command'] extends (cmd: string, handler: infer T) => unknown ? T : never
  type WebhookHandlerBase = (bot: Telegraf, req: Request, res: Response) => unknown
  interface WebhookHandler extends WebhookHandlerBase {
    path?: string
    method?: 'all' | 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'
  }

  namespace ChatGPT {
    export interface ChatHistoryItem {
      reply_to_message_id: number
      reply_to_chat_id?: number
      system_chat_id?: number
      system_message_id?: number
      input: string
      output: string
      system?: string
      image_url?: string
      token: number
      id: number
    }
  }

  namespace Fixer {
    export interface LatestFXRateResponse {
      success: boolean,
      timestamp: number,
      base: string,
      date: string,
      rates: Record<string, number>
    }
  }

  namespace AQI {
    export interface AQIResponse {
      status: string
      data: Data
    }

    export interface Data {
      aqi: number
      idx: number
      attributions: Attribution[]
      city: City
      dominentpol: string
      iaqi: Iaqi
      time: Time
      forecast: Forecast
      debug: Debug
    }

    export interface Attribution {
      url: string
      name: string
    }

    export interface City {
      geo: number[]
      name: string
      url: string
    }

    export interface Debug {
      sync: Date
    }

    export interface Forecast {
      daily: Daily
    }

    export interface Daily {
      o3: O3[]
      pm10: O3[]
      pm25: O3[]
      uvi: O3[]
    }

    export interface O3 {
      avg: number
      day: Date
      max: number
      min: number
    }

    export interface Iaqi {
      co: Co
      h: Co
      no2: Co
      o3: Co
      p: Co
      pm10: Co
      pm25: Co
      so2: Co
      t: Co
      w: Co
    }

    export interface Co {
      v: number
    }

    export interface Time {
      s: Date
      tz: string
      v: number
      iso: Date
    }
  }

  namespace NeteaseMusic {
    export interface NeteaseMusicSongURLResponse {
      data: Datum[]
      code: number
    }

    export interface Datum {
      id: number
      url: string
      br: number
      size: number
      md5: string
      code: number
      expi: number
      type: string
      gain: number
      fee: number
      uf: null
      payed: number
      flag: number
      canExtend: boolean
      freeTrialInfo: null
      level: string
      encodeType: string
      freeTrialPrivilege: FreeTrialPrivilege
      freeTimeTrialPrivilege: FreeTimeTrialPrivilege
      urlSource: number
    }

    export interface FreeTimeTrialPrivilege {
      resConsumable: boolean
      userConsumable: boolean
      type: number
      remainTime: number
    }

    export interface FreeTrialPrivilege {
      resConsumable: boolean
      userConsumable: boolean
      listenType: null
    }

    export interface NeteaseMusicSongDetailResponse {
      songs: Song[]
      privileges: Privilege[]
      code: number
    }

    export interface Privilege {
      id: number
      fee: number
      payed: number
      st: number
      pl: number
      dl: number
      sp: number
      cp: number
      subp: number
      cs: boolean
      maxbr: number
      fl: number
      toast: boolean
      flag: number
      preSell: boolean
      playMaxbr: number
      downloadMaxbr: number
      rscl: null
      freeTrialPrivilege: FreeTrialPrivilege
      chargeInfoList: ChargeInfoList[]
    }

    export interface ChargeInfoList {
      rate: number
      chargeUrl: null
      chargeMessage: null
      chargeType: number
    }

    export interface FreeTrialPrivilege {
      resConsumable: boolean
      userConsumable: boolean
    }

    export interface Song {
      name: string
      id: number
      pst: number
      t: number
      ar: Ar[]
      alia: any[]
      pop: number
      st: number
      rt: string
      fee: number
      v: number
      crbt: null
      cf: string
      al: Al
      dt: number
      h: H
      m: H
      l: H
      a: null
      cd: string
      no: number
      rtUrl: null
      ftype: number
      rtUrls: any[]
      djId: number
      copyright: number
      s_id: number
      mark: number
      originCoverType: number
      originSongSimpleData: null
      tagPicList: null
      resourceState: boolean
      version: number
      songJumpInfo: null
      entertainmentTags: null
      single: number
      noCopyrightRcmd: null
      rtype: number
      rurl: null
      mst: number
      cp: number
      mv: number
      publishTime: number
    }

    export interface Al {
      id: number
      name: string
      picUrl: string
      tns: any[]
      pic: number
    }

    export interface Ar {
      id: number
      name: string
      tns: any[]
      alias: any[]
    }

    export interface H {
      br: number
      fid: number
      size: number
      vd: number
    }
  }

  interface GenshinUserInfo {
    cookie: string
    uid: number
  }

  interface HSRUserInfo {
    cookie: string
    uid: number
    server: string
    is_overseas: boolean
  }

  namespace GenshinImpact {
    export interface GenshinResinResponse {
      retcode: number
      message: string
      data?: Data
    }

    export interface Data {
      current_resin: number
      max_resin: number
      resin_recovery_time: string
      finished_task_num: number
      total_task_num: number
      is_extra_task_reward_received: boolean
      remain_resin_discount_num: number
      resin_discount_num_limit: number
      current_expedition_num: number
      max_expedition_num: number
      expeditions: Expedition[]
      current_home_coin: number
      max_home_coin: number
      home_coin_recovery_time: string
      calendar_url: string
      transformer: {
        obtained: boolean
        recovery_time: {
          Day: number
          Hour: number
          Minute: number
          Second: number
          reached: boolean
        }
        wiki: string
        noticed: boolean
        latest_job_id: string
      }
    }

    export interface Expedition {
      avatar_side_icon: string
      status: string
      remained_time: string
    }
  }

  namespace HSR {
    export interface HSRStaminaResponse {
      retcode: number
      message: string
      data: {
        current_stamina: number
        max_stamina: number
        stamina_recover_time: number
        accepted_epedition_num: number
        total_expedition_num: number
        expeditions: Expedition[]
      }
    }

    export interface Expedition {
      avatars: string[]
      status: string
      remaining_time: number
      name: string
    }
  }

  namespace PaimonMoe {
    interface GenshinEvent {
      name: string
      pos: string
      image: string
      start: string
      end: string
      color: string
      zoom: string
      url: string
      showOnHome: boolean
    }
  }
}

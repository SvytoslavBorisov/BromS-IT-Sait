import { Context, Scenes } from "telegraf";

/** ВНУТРЕННЯЯ wizard-сессия (то, что живёт в ctx.scene.session) */
export interface MyWizard extends Scenes.WizardSessionData {
  // сюда можно класть временные шаговые данные мастера
  tempName?: string;
}

/** ГЛОБАЛЬНАЯ сессия (то, что живёт в ctx.session) */
export interface MySession extends Scenes.SceneSession<MyWizard> {
  startPayload?: string;
  profile?: { name?: string; color?: string };
}

/** Контекст: базовый + WizardContext c MyWizard, и явный ctx.session: MySession */
export type MyContext = Context & Scenes.WizardContext<MyWizard> & { session: MySession };

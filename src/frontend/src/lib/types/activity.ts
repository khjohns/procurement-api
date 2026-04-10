/** Known activity action types from the Artifik API. */
export type ActivityAction =
  | 'SUBMIT_BID'
  | 'ASK_TO_QUALIFY'
  | 'QUALIFYING_PARTICIPANTS'
  | 'REJECT_PARTICIPATION'
  | 'WITHDRAW_PARTICIPATION'
  | 'PUBLISH_TO_DOFFIN'
  | 'AWARDING_PARTICIPANTS'
  | 'CONVERSATION_MARKED_COMPLETED'
  | 'DOFFIN_NOTICE_STATUS_PUBLISHED';

export interface ActivityOrg {
  id?: string;
  name?: string;
}

/** Procurement activity from the Artifik API. */
export interface Activity {
  date: string;
  action: ActivityAction | string; // allow unknown actions
  organization?: ActivityOrg;
  supplier?: ActivityOrg;
  description?: Record<string, unknown>;
}

export type CrmConversationState = "bot" | "human" | "closed";
export type CrmPriority = 1 | 2 | 3 | 4;
export type CrmScoreTier = "hot" | "warm" | "exploring";

export type CrmTag = {
  id: string;
  name: string;
  color: "olive" | "wine" | "gold" | "blue" | "gray";
  selected?: boolean;
};

export type CrmSavedReply = {
  id: string;
  title: string;
  body: string;
  category: string;
};

export type CrmMessageAttachment = {
  fileName: string;
  mimeType?: string;
  url?: string;
  storagePath?: string;
};

export type CrmMessage = {
  id: string;
  direction: "inbound" | "outbound";
  kind: "text" | "interactive" | "template" | "media" | "status" | "system";
  body: string | null;
  deliveryStatus: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
  attachment?: CrmMessageAttachment;
};

export type CrmInboxItem = {
  id: string;
  contactId: string;
  customerId: string | null;
  contactName: string | null;
  phone: string;
  state: CrmConversationState;
  intent: string | null;
  priority: CrmPriority;
  assignedTo: string | null;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  lastMessageAt: string;
  lastReadAt: string | null;
  slaDueAt: string | null;
  firstHumanResponseAt: string | null;
  unread: boolean;
  slaBreached: boolean;
  preview: string;
  previewDirection: "inbound" | "outbound" | null;
  handoff: { status: string; reason: string; requestedAt: string } | null;
  qualification: Record<string, string>;
  marketingConsent: string;
  score: number;
  scoreTier: CrmScoreTier;
};

export type CrmTask = {
  id: string;
  subject: string;
  body: string | null;
  status: "planned" | "completed" | "cancelled";
  dueAt: string | null;
  priority: CrmPriority;
  kind: string;
  conversationId: string | null;
  opportunityId: string | null;
  createdAt: string;
};

export type CrmOpportunityCard = {
  id: string;
  title: string;
  segment: string;
  stage: string;
  score: number;
  valueCents: number | null;
  currency: string;
  nextAction: string | null;
  nextActionAt: string | null;
  lostReason: string | null;
  updatedAt: string;
};

export type CrmCustomer360 = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  lifecycleStage: string;
  sourceChannel: string;
  marketingConsent: string;
  score: number;
  scoreTier: CrmScoreTier;
  totalOrders: number;
  paidOrders: number;
  totalSpentCents: number;
  averageOrderCents: number;
  lastOrderAt: string | null;
  lastActivityAt: string | null;
  lastPurchaseAt: string | null;
  qualification: Record<string, string>;
  tags: CrmTag[];
  orders: Array<{
    id: string;
    orderNumber: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    totalCents: number;
    currency: string;
    createdAt: string;
  }>;
  opportunities: CrmOpportunityCard[];
  tasks: CrmTask[];
  claims: Array<{
    id: string;
    claimNumber: string;
    status: string;
    claimType: string;
    createdAt: string;
  }>;
  emails: Array<{
    id: string;
    kind: string;
    state: string;
    deliveryStatus: string | null;
    createdAt: string;
  }>;
  mergeCandidates: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string;
  }>;
};

export type CrmConversationDetail = {
  conversation: CrmInboxItem;
  messages: CrmMessage[];
  customer: CrmCustomer360 | null;
  tasks: CrmTask[];
};

export type CrmInboxData = {
  items: CrmInboxItem[];
  selected: CrmConversationDetail | null;
  savedReplies: CrmSavedReply[];
  tags: CrmTag[];
  metrics: CrmMetrics;
};

export type CrmMetrics = {
  newConversations: number;
  openConversations: number;
  unreadConversations: number;
  breachedSla: number;
  openHumanHandoffs: number;
  openTasks: number;
  overdueTasks: number;
  whatsappOrders: number;
  whatsappRevenueCents: number;
  averageFirstResponseMinutes: number | null;
  botResolutionRate: number | null;
  checkoutConversionRate: number | null;
  hotLeads: number;
  totalCheckouts: number;
  abandonedCheckouts: number;
  recoveredCheckouts: number;
  averageBottlesPerOrder: number | null;
  openOpportunityCount: number;
  pipelineValueCents: number;
  customerSegments: Record<string, number>;
  opportunitiesByStage: Record<string, number>;
  topRecommendedProducts: Array<{ productId: string; name: string; quantity: number }>;
  topSoldProducts: Array<{ productId: string; name: string; quantity: number }>;
};

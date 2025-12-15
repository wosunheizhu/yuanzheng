/**
 * 元征 · 合伙人赋能平台 - API 服务层
 */
import apiClient, { PaginatedResponse } from './api'

// 重新导出 apiClient 供其他组件使用
export { apiClient }

// ============ 类型定义 ============

// 用户相关
export interface Role {
  id: number
  name: string
  code: string
  role_level: number
}

export interface User {
  id: number
  name: string
  email?: string
  phone?: string
  avatar_url?: string
  organization?: string
  organization_public: boolean
  title?: string
  gender?: string
  birth_date?: string
  intro?: string
  expertise?: string
  contact?: string
  contact_public: boolean
  address?: string
  address_public: boolean
  education?: string
  tags?: string[]
  hobbies?: string
  signature?: string
  is_active: boolean
  is_admin: boolean
  created_at: string
  updated_at: string
  roles: Role[]
  highest_role_level: number
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

// Token 相关
export interface TokenAccount {
  user_id: number
  balance: string
  initial_balance: string
  created_at: string
  updated_at: string
}

export interface TokenTransaction {
  id: number
  from_user_id?: number
  to_user_id?: number
  amount: string
  direction: 'TRANSFER' | 'ADMIN_GRANT' | 'ADMIN_DEDUCT' | 'DIVIDEND'
  related_project_id?: number
  related_demand_id?: number
  status: 'PENDING_ADMIN_APPROVAL' | 'PENDING_RECEIVER_CONFIRM' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'
  reason?: string
  admin_comment?: string
  created_by_user_id: number
  created_at: string
  updated_at: string
  from_user_name?: string
  to_user_name?: string
  project_name?: string
}

// 项目相关
export interface ProjectMember {
  user_id: number
  user_name: string
  role_in_project: 'OWNER' | 'MEMBER' | 'RECORDER'
  duty_description?: string
  join_time: string
  leave_time?: string
}

export interface ProjectShare {
  id: number
  owner_type: 'ORG' | 'USER'
  owner_id: number
  owner_name: string
  percentage: string
  effective_from: string
  note?: string
}

export interface Project {
  id: number
  name: string
  description?: string
  business_type: string
  industry?: string
  region?: string
  review_status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  business_status: 'ONGOING' | 'PAUSED' | 'COMPLETED' | 'ABANDONED'
  created_by: number
  creator_name: string
  visibility_scope_type: string
  visibility_min_role_level?: number
  created_at: string
  updated_at: string
  members: ProjectMember[]
  shares: ProjectShare[]
}

export interface ProjectEvent {
  id: number
  project_id: number
  event_type: string
  title: string
  description?: string
  created_by_user_id: number
  created_by_name: string
  created_at: string
  related_demand_id?: number
  related_response_id?: number
  related_transaction_id?: number
  related_meeting_id?: number
  related_news_id?: number
  related_value_record_id?: number
  old_status?: string
  new_status?: string
  share_change_snapshot?: any
  payload?: any
}

export interface ProjectJoinRequest {
  id: number
  project_id: number
  project_name?: string
  applicant_id: number
  applicant_name?: string
  desired_role: 'OWNER' | 'MEMBER'
  duty_description: string
  intended_share_pct?: number
  note?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewed_by?: number
  reviewer_name?: string
  reviewed_at?: string
  review_comment?: string
  created_at: string
  updated_at: string
}

export interface ProjectInvitation {
  id: number
  project_id: number
  project_name?: string
  inviter_id: number
  inviter_name?: string
  invitee_id: number
  invitee_name?: string
  proposed_role: 'OWNER' | 'MEMBER' | 'RECORDER'
  proposed_duty?: string
  proposed_share_pct?: number
  message?: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'
  responded_at?: string
  response_note?: string
  created_at: string
}

// 需求相关
export interface DemandParticipant {
  user_id: number
  user_name: string
  is_owner: boolean
}

export interface Demand {
  id: number
  project_id: number
  project_name: string
  group_id?: number
  title: string
  description: string
  business_type: string
  industry?: string
  status: 'OPEN' | 'CLOSED' | 'CANCELLED'
  expected_reward?: any
  owner_user_id: number
  owner_name: string
  visibility_scope_type: string
  visibility_min_role_level?: number
  created_at: string
  updated_at: string
  participants: DemandParticipant[]
  response_count: number
}

export interface DemandResponse {
  id: number
  demand_id: number
  responder_id: number
  responder_name?: string
  responder?: {
    id: number
    name: string
  }
  proposal: string
  expected_reward?: any
  final_reward?: any
  status: 'SUBMITTED' | 'ACCEPTED_PENDING_USAGE' | 'REJECTED' | 'ABANDONED'
  created_at: string
  updated_at: string
}

// 资源相关
export interface Resource {
  id: number
  owner_user_id: number
  owner_name: string
  org_name: string
  description: string
  relationship_strength: number
  industry?: string
  region?: string
  note?: string
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED'
  visibility_scope_type: string
  visibility_min_role_level?: number
  created_at: string
  updated_at: string
  tags: { id: number; name: string }[]
}

// 座谈会相关
export interface MeetingParticipant {
  user_id: number
  user_name: string
  role: 'HOST' | 'ATTENDEE' | 'OPTIONAL'
  attendance_status: 'INVITED' | 'ATTENDING' | 'DECLINED' | 'NO_SHOW'
}

export interface ExternalGuest {
  id: number
  meeting_id: number
  name: string
  organization?: string
  title?: string
  contact?: string
  notes?: string
  invited_by_user_id?: number
  invited_by_user_ids?: number[]
  invited_by_name?: string
  invited_by_names?: string[]
  created_at: string
}

export interface MeetingMinutes {
  meeting_id: number
  content: string
  attachments?: any[]
  created_by_user_id: number
  created_by_name?: string
  created_at: string
  updated_at: string
}

export interface Meeting {
  id: number
  title: string
  description?: string
  meeting_level: 'INTERNAL' | 'EXTERNAL'
  confidentiality_level: 'LOW' | 'MEDIUM' | 'HIGH'
  related_project_id?: number
  related_project_name?: string
  start_time: string
  end_time: string
  location?: string
  created_by_user_id: number
  created_by_name?: string
  status: 'PLANNING' | 'CONFIRMED' | 'CANCELLED' | 'FINISHED'
  visibility_scope_type: string
  visibility_min_role_level?: number
  created_at: string
  updated_at?: string
  participants: MeetingParticipant[]
  external_guests: ExternalGuest[]
  has_minutes?: boolean
}

export interface UserAvailability {
  id: number
  user_id: number
  user_name?: string
  start_time: string
  end_time: string
  note?: string
  visibility_scope_type: string
  visibility_min_role_level?: number
  created_at: string
}

// 投票相关
export interface VoteOption {
  id: number
  text: string
  order_no: number
  vote_count: number
}

export interface Vote {
  id: number
  title: string
  reason: string
  description?: string
  created_by: number
  creator_name: string
  status: 'OPEN' | 'CLOSED'
  end_time: string
  is_anonymous: boolean
  pass_rule: string
  allow_abstain: boolean
  created_at: string
  options: VoteOption[]
  total_votes: number
  user_voted: boolean
  user_option_id?: number
}

// 社群相关
export interface PostAttachment {
  name: string
  url: string
  type?: string
  size?: number
}

export interface Post {
  id: number
  author_user_id: number
  author_name: string
  author_avatar?: string
  post_type: 'GENERAL' | 'PROJECT' | 'RESOURCE' | 'VOTE' | 'ANNOUNCEMENT_REF'
  content: string
  attachments?: PostAttachment[]
  related_project_id?: number
  related_project_name?: string
  related_resource_id?: number
  related_resource_name?: string
  created_at: string
  like_count: number
  comment_count: number
  user_liked: boolean
}

export interface Comment {
  id: number
  post_id: number
  user_id: number
  user_name: string
  user_avatar?: string
  content: string
  mentions?: number[]
  created_at: string
}

// 信箱相关
export interface InboxItem {
  id: number
  category: 'ANNOUNCEMENT' | 'SYSTEM' | 'VOTE' | 'DM' | 'MENTION'
  title: string
  content?: string
  related_object_type?: string
  related_object_id?: number
  is_read: boolean
  created_at: string
}

export interface InboxStats {
  total_unread: number
  announcement_unread: number
  system_unread: number
  vote_unread: number
  dm_unread: number
  mention_unread: number
}

// 仪表盘统计
export interface DashboardStats {
  users: { total: number }
  projects: { total: number; pending_review: number }
  tokens: { total_balance: number; pending_transactions: number }
  resources: { total: number }
  value: { total: number; currency: string }
}

// ============ 认证服务 ============

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)
    
    const response = await apiClient.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    return response.data
  },
  
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
  
  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword
    })
  },
}

// ============ Token 服务 ============

export const tokenService = {
  getMyAccount: async (): Promise<TokenAccount> => {
    const response = await apiClient.get('/token/me/account')
    return response.data
  },
  
  getMyTransactions: async (params?: {
    page?: number
    page_size?: number
    direction?: string
    status?: string
  }): Promise<PaginatedResponse<TokenTransaction>> => {
    const response = await apiClient.get('/token/me/transactions', { params })
    return response.data
  },
  
  createTransaction: async (data: {
    to_user_id: number
    amount: number
    related_project_id?: number
    reason: string
    note?: string
  }): Promise<TokenTransaction> => {
    const response = await apiClient.post('/token/transactions', data)
    return response.data
  },
  
  confirmTransaction: async (txId: number, accept: boolean, comment?: string): Promise<void> => {
    await apiClient.post(`/token/transactions/${txId}/confirm`, { accept, comment })
  },
  
  createDividend: async (data: {
    project_id: number
    description: string
    recipients: { user_id: number; amount: number; note?: string }[]
  }): Promise<TokenTransaction[]> => {
    const response = await apiClient.post('/token/admin/dividend', data)
    return response.data
  },
}

// ============ 项目服务 ============

export const projectService = {
  list: async (params?: {
    page?: number
    page_size?: number
    review_status?: string
    business_status?: string
    my_projects?: boolean
    search?: string
    skip?: number
    limit?: number
  }): Promise<PaginatedResponse<Project>> => {
    const response = await apiClient.get('/projects', { params })
    return response.data
  },
  
  get: async (id: number): Promise<Project> => {
    const response = await apiClient.get(`/projects/${id}`)
    return response.data
  },
  
  create: async (data: {
    name: string
    description?: string
    business_type: string
    industry?: string
    region?: string
    business_status: string
    visibility_scope_type: string
    visibility_min_role_level?: number
    owner_ids: number[]
    member_ids?: number[]
    shares: { owner_type: string; owner_id: number; percentage: number; note?: string }[]
  }): Promise<Project> => {
    const response = await apiClient.post('/projects', data)
    return response.data
  },
  
  update: async (id: number, data: Partial<Project>): Promise<Project> => {
    const response = await apiClient.put(`/projects/${id}`, data)
    return response.data
  },
  
  getEvents: async (projectId: number, params?: {
    event_type?: string
    skip?: number
    limit?: number
  }): Promise<ProjectEvent[]> => {
    const response = await apiClient.get(`/projects/${projectId}/events`, { params })
    return response.data
  },
  
  createEvent: async (projectId: number, data: {
    event_type?: string
    title: string
    description?: string
  }): Promise<ProjectEvent> => {
    const response = await apiClient.post(`/projects/${projectId}/events`, data)
    return response.data
  },
  
  // 编辑项目事件
  updateEvent: async (projectId: number, eventId: number, data: {
    title?: string
    description?: string
    edit_reason?: string
  }): Promise<ProjectEvent> => {
    const params = new URLSearchParams()
    if (data.title) params.append('title', data.title)
    if (data.description !== undefined) params.append('description', data.description)
    if (data.edit_reason) params.append('edit_reason', data.edit_reason)
    const response = await apiClient.put(`/projects/${projectId}/events/${eventId}?${params.toString()}`)
    return response.data
  },
  
  // 获取事件编辑历史
  getEventEditHistory: async (projectId: number, eventId: number): Promise<any[]> => {
    const response = await apiClient.get(`/projects/${projectId}/events/${eventId}/history`)
    return response.data
  },
  
  requestJoin: async (projectId: number, data: {
    desired_role: string
    duty_description: string
    intended_share_pct?: number
    note?: string
  }): Promise<any> => {
    const response = await apiClient.post(`/projects/${projectId}/join-requests`, data)
    return response.data
  },
  
  // 获取加入申请列表（负责人/管理员）
  getJoinRequests: async (projectId: number): Promise<ProjectJoinRequest[]> => {
    const response = await apiClient.get(`/projects/${projectId}/join-requests`)
    return response.data
  },
  
  // 审核加入申请
  reviewJoinRequest: async (requestId: number, data: {
    approved: boolean
    actual_share_pct?: number
    deductions?: { share_id: number; amount: number }[]  // 从多个股权方扣除
    comment?: string
  }): Promise<any> => {
    const response = await apiClient.post(`/projects/join-requests/${requestId}/review`, data)
    return response.data
  },
  
  adjustShares: async (projectId: number, data: {
    shares: { owner_type: string; owner_id: number; percentage: number; note?: string }[]
    reason: string
  }): Promise<ProjectShare[]> => {
    const response = await apiClient.post(`/projects/${projectId}/shares/adjust`, data)
    return response.data
  },
  
  // 邀请成员
  createInvitation: async (projectId: number, data: {
    invitee_id: number
    proposed_role?: 'OWNER' | 'MEMBER' | 'RECORDER'
    proposed_duty?: string
    proposed_share_pct?: number
    message?: string
  }): Promise<ProjectInvitation> => {
    const response = await apiClient.post(`/projects/${projectId}/invitations`, data)
    return response.data
  },
  
  // 获取项目邀请列表
  listInvitations: async (projectId: number): Promise<ProjectInvitation[]> => {
    const response = await apiClient.get(`/projects/${projectId}/invitations`)
    return response.data
  },
  
  // 获取我收到的邀请
  getMyInvitations: async (): Promise<ProjectInvitation[]> => {
    const response = await apiClient.get('/projects/invitations/my')
    return response.data
  },
  
  // 获取单个邀请详情
  getInvitationDetail: async (invitationId: number): Promise<ProjectInvitation> => {
    const response = await apiClient.get(`/projects/invitations/${invitationId}`)
    return response.data
  },
  
  // 响应邀请
  respondToInvitation: async (invitationId: number, data: {
    status: 'ACCEPTED' | 'DECLINED'
    response_note?: string
  }): Promise<ProjectInvitation> => {
    // 转换为后端需要的格式
    const response = await apiClient.post(`/projects/invitations/${invitationId}/respond`, {
      accepted: data.status === 'ACCEPTED',
      note: data.response_note
    })
    return response.data
  },
}

// ============ 需求服务 ============

export const demandService = {
  list: async (params?: {
    project_id?: number
    status?: string
    my_demands?: boolean
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<Demand>> => {
    const response = await apiClient.get('/demands', { params })
    return response.data
  },
  
  get: async (id: number): Promise<Demand> => {
    const response = await apiClient.get(`/demands/${id}`)
    return response.data
  },
  
  create: async (data: {
    project_ids: number[]
    title: string
    description: string
    business_type: string
    industry?: string
    participant_ids: number[]
    expected_reward?: any
    visibility_scope_type: string
    visibility_min_role_level?: number
  }): Promise<Demand[]> => {
    const response = await apiClient.post('/demands', data)
    return response.data
  },
  
  getResponses: async (demandId: number): Promise<DemandResponse[]> => {
    const response = await apiClient.get(`/demands/${demandId}/responses`)
    return response.data
  },
  
  createResponse: async (data: {
    demand_id: number
    proposal: string
    expected_reward?: any
    note?: string
  }): Promise<DemandResponse> => {
    const response = await apiClient.post('/demands/responses', data)
    return response.data
  },
  
  reviewResponse: async (responseId: number, data: {
    accepted: boolean
    final_reward?: any
    comment?: string
  }): Promise<void> => {
    await apiClient.post(`/demands/responses/${responseId}/review`, data)
  },
  
  markUsed: async (responseId: number, data: {
    note?: string
    initiate_payment?: boolean
    token_amount?: number
    payment_reason?: string
  }): Promise<{
    message: string
    response_status: string
    token_transaction?: {
      id: number
      amount: number
      status: string
    }
  }> => {
    const response = await apiClient.post(`/demands/responses/${responseId}/mark-used`, data)
    return response.data
  },
  
  getMyResponsesStats: async (): Promise<{
    total_responses: number
    accepted_responses: number
    used_responses: number
  }> => {
    const response = await apiClient.get('/demands/my-responses/stats')
    return response.data
  },
  
  getMyResponses: async (): Promise<{
    id: number
    demand_id: number
    demand_title?: string
    demand_project_name?: string
    responder_id: number
    responder_name?: string
    proposal: string
    expected_reward?: any
    final_reward?: any
    status: string
    created_at: string
    updated_at: string
  }[]> => {
    const response = await apiClient.get('/demands/my-responses')
    return response.data
  },
}

// ============ 资源服务 ============

export const resourceService = {
  list: async (params?: {
    industry?: string
    region?: string
    min_strength?: number
    page?: number
    page_size?: number
    search?: string
    skip?: number
    limit?: number
  }): Promise<PaginatedResponse<Resource>> => {
    const response = await apiClient.get('/resources', { params })
    return response.data
  },
  
  getMyResources: async (params?: {
    page?: number
    page_size?: number
    skip?: number
    limit?: number
  }): Promise<PaginatedResponse<Resource>> => {
    const response = await apiClient.get('/resources/me', { params })
    return response.data
  },
  
  get: async (id: number): Promise<Resource> => {
    const response = await apiClient.get(`/resources/${id}`)
    return response.data
  },
  
  create: async (data: {
    org_name: string
    description: string
    relationship_strength: number
    industry?: string
    region?: string
    note?: string
    tag_names?: string[]
  }): Promise<Resource> => {
    const response = await apiClient.post('/resources', data)
    return response.data
  },
  
  update: async (id: number, data: Partial<Resource>): Promise<Resource> => {
    const response = await apiClient.put(`/resources/${id}`, data)
    return response.data
  },
  
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/resources/${id}`)
  },
  
  search: async (query: string): Promise<Resource[]> => {
    const response = await apiClient.post('/resources/search', { query })
    return response.data
  },
}

// ============ 座谈会服务 ============

export const meetingService = {
  list: async (params?: {
    status?: string
    related_project_id?: number
    upcoming?: boolean
    page?: number
    page_size?: number
    skip?: number
    limit?: number
  }): Promise<PaginatedResponse<Meeting>> => {
    const response = await apiClient.get('/meetings', { params })
    return response.data
  },
  
  get: async (id: number): Promise<Meeting> => {
    const response = await apiClient.get(`/meetings/${id}`)
    return response.data
  },
  
  create: async (data: {
    title: string
    description?: string
    meeting_level: string
    confidentiality_level: string
    related_project_id?: number
    start_time: string
    end_time: string
    location?: string
    visibility_scope_type: string
    visibility_min_role_level?: number
    visibility_user_ids?: number[]
    participant_ids?: number[]
  }): Promise<Meeting> => {
    const response = await apiClient.post('/meetings', data)
    return response.data
  },
  
  update: async (id: number, data: Partial<Meeting>): Promise<Meeting> => {
    const response = await apiClient.put(`/meetings/${id}`, data)
    return response.data
  },
  
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/meetings/${id}`)
  },
  
  // 参与者管理
  addParticipant: async (meetingId: number, data: {
    user_id: number
    role: 'HOST' | 'ATTENDEE' | 'OPTIONAL'
  }): Promise<void> => {
    await apiClient.post(`/meetings/${meetingId}/participants`, data)
  },
  
  updateAttendance: async (meetingId: number, userId: number, data: {
    attendance_status: 'INVITED' | 'ATTENDING' | 'DECLINED' | 'NO_SHOW'
  }): Promise<void> => {
    await apiClient.put(`/meetings/${meetingId}/participants/${userId}/attendance`, data)
  },
  
  // 外部嘉宾
  addGuest: async (meetingId: number, data: {
    name: string
    organization?: string
    title?: string
    contact?: string
    notes?: string
    invited_by_user_ids?: number[]
  }): Promise<ExternalGuest> => {
    const response = await apiClient.post(`/meetings/${meetingId}/guests`, data)
    return response.data
  },
  
  deleteGuest: async (meetingId: number, guestId: number): Promise<void> => {
    await apiClient.delete(`/meetings/${meetingId}/guests/${guestId}`)
  },
  
  getMyInvitations: async (): Promise<ExternalGuest[]> => {
    const response = await apiClient.get('/meetings/guests/my-invitations')
    return response.data
  },
  
  // 移除参会人员
  removeParticipant: async (meetingId: number, userId: number): Promise<void> => {
    await apiClient.delete(`/meetings/${meetingId}/participants/${userId}`)
  },
  
  // 会议纪要
  getMinutes: async (meetingId: number): Promise<MeetingMinutes> => {
    const response = await apiClient.get(`/meetings/${meetingId}/minutes`)
    return response.data
  },
  
  createOrUpdateMinutes: async (meetingId: number, data: {
    content: string
    attachments?: any[]
  }): Promise<MeetingMinutes> => {
    const response = await apiClient.post(`/meetings/${meetingId}/minutes`, data)
    return response.data
  },
  
  // 可用时间
  getMyAvailability: async (params?: {
    start_date?: string
    end_date?: string
  }): Promise<UserAvailability[]> => {
    const response = await apiClient.get('/meetings/availability/me', { params })
    return response.data
  },
  
  getAllAvailability: async (params?: {
    user_id?: number
    start_date?: string
    end_date?: string
  }): Promise<UserAvailability[]> => {
    const response = await apiClient.get('/meetings/availability/all', { params })
    return response.data
  },
  
  addAvailability: async (data: {
    start_time: string
    end_time: string
    note?: string
    visibility_scope_type?: string
    visibility_min_role_level?: number
  }): Promise<UserAvailability> => {
    const response = await apiClient.post('/meetings/availability', data)
    return response.data
  },
  
  deleteAvailability: async (availabilityId: number): Promise<void> => {
    await apiClient.delete(`/meetings/availability/${availabilityId}`)
  },
  
  getGuestStats: async (): Promise<{
    total_invited_guests: number
  }> => {
    const response = await apiClient.get('/meetings/guests/my-stats')
    return response.data
  },
}

// ============ 投票服务 ============

export interface VoteResult {
  vote_id: number
  title: string
  status: string
  total_votes: number
  options: VoteOption[]
  pass_rule: string
  is_passed?: boolean
  records?: {
    user_id: number
    user_name: string
    option_id: number
    option_text: string
    created_at: string
  }[]
}

export const voteService = {
  // 获取投票列表
  list: async (params?: {
    status?: string
    skip?: number
    limit?: number
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<Vote>> => {
    const response = await apiClient.get('/votes', { params })
    return response.data
  },
  
  // 获取投票详情
  get: async (id: number): Promise<Vote> => {
    const response = await apiClient.get(`/votes/${id}`)
    return response.data
  },
  
  // 创建投票（管理员）
  create: async (data: {
    title: string
    reason: string
    description?: string
    end_time: string
    is_anonymous?: boolean
    pass_rule?: string
    allow_abstain?: boolean
    visibility_scope_type?: string
    visibility_min_role_level?: number
    visibility_user_ids?: number[]
    options: { text: string; order_no: number }[]
  }): Promise<Vote> => {
    const response = await apiClient.post('/votes', data)
    return response.data
  },
  
  // 投票
  cast: async (voteId: number, optionId: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`/votes/${voteId}/cast`, { option_id: optionId })
    return response.data
  },
  
  // 获取投票结果
  getResult: async (voteId: number): Promise<VoteResult> => {
    const response = await apiClient.get(`/votes/${voteId}/result`)
    return response.data
  },
  
  // 关闭投票（管理员）
  close: async (voteId: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`/votes/${voteId}/close`)
    return response.data
  },
}

// ============ 社群服务 ============

export const communityService = {
  // ========== 动态帖子 ==========
  listPosts: async (params?: {
    post_type?: string
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<Post>> => {
    const response = await apiClient.get('/community/posts', { params })
    return response.data
  },
  
  getPost: async (postId: number): Promise<Post> => {
    const response = await apiClient.get(`/community/posts/${postId}`)
    return response.data
  },
  
  createPost: async (data: {
    content: string
    post_type?: string
    related_project_id?: number
    related_resource_id?: number
    visibility_scope_type?: string
    visibility_min_role_level?: number
  }): Promise<Post> => {
    const response = await apiClient.post('/community/posts', data)
    return response.data
  },
  
  updatePost: async (postId: number, data: {
    content?: string
    post_type?: string
    visibility_scope_type?: string
  }): Promise<Post> => {
    const response = await apiClient.put(`/community/posts/${postId}`, data)
    return response.data
  },
  
  deletePost: async (postId: number): Promise<void> => {
    await apiClient.delete(`/community/posts/${postId}`)
  },
  
  likePost: async (postId: number): Promise<{ liked: boolean }> => {
    const response = await apiClient.post(`/community/posts/${postId}/like`)
    return response.data
  },
  
  unlikePost: async (postId: number): Promise<{ liked: boolean }> => {
    const response = await apiClient.delete(`/community/posts/${postId}/like`)
    return response.data
  },
  
  getComments: async (postId: number): Promise<Comment[]> => {
    const response = await apiClient.get(`/community/posts/${postId}/comments`)
    return response.data
  },
  
  createComment: async (postId: number, content: string, mentions?: number[]): Promise<Comment> => {
    const response = await apiClient.post(`/community/posts/${postId}/comments`, { content, mentions })
    return response.data
  },
  
  deleteComment: async (postId: number, commentId: number): Promise<void> => {
    await apiClient.delete(`/community/posts/${postId}/comments/${commentId}`)
  },
  
  // ========== 意见反馈 ==========
  createFeedback: async (data: {
    category: string
    title: string
    content: string
    contact?: string
    allow_contact?: boolean
  }): Promise<any> => {
    const response = await apiClient.post('/community/feedbacks', data)
    return response.data
  },
  
  listFeedbacks: async (params?: {
    category?: string
    status?: string
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<any>> => {
    const response = await apiClient.get('/community/feedbacks', { params })
    return response.data
  },
}

// ============ 私信服务 ============

export interface DMThread {
  id: number
  other_user_id: number
  other_user_name: string
  other_user_avatar?: string
  last_message?: string
  last_message_time?: string
  unread_count: number
}

export interface DMAttachment {
  name: string
  url: string
  type: string
  size?: number
}

export interface DMReference {
  type: 'project' | 'resource'
  id: number
  name: string
}

export interface DMMessage {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  is_read: boolean
  created_at: string
  attachments?: DMAttachment[]
  reference?: DMReference
}

export const dmService = {
  // 获取会话列表
  listThreads: async (): Promise<{ items: DMThread[], total: number }> => {
    const response = await apiClient.get('/community/dm/threads')
    return response.data
  },
  
  // 获取与某用户的消息
  getMessages: async (userId: number, params?: {
    page?: number
    page_size?: number
  }): Promise<DMMessage[]> => {
    const response = await apiClient.get(`/community/dm/threads/${userId}/messages`, { params })
    return response.data
  },
  
  // 发送私信
  sendMessage: async (userId: number, data: {
    content?: string
    attachments?: DMAttachment[]
    reference?: DMReference
  }): Promise<DMMessage> => {
    const response = await apiClient.post(`/community/dm/threads/${userId}/messages`, data)
    return response.data
  },
  
  // 标记为已读
  markAsRead: async (userId: number): Promise<void> => {
    await apiClient.post(`/community/dm/threads/${userId}/read`)
  },
  
  // 获取未读消息数
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get('/community/dm/unread-count')
    return response.data
  },
}

// ============ 通知服务 ============

export const notificationService = {
  getInbox: async (params?: {
    category?: string
    unread_only?: boolean
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<InboxItem>> => {
    const response = await apiClient.get('/notifications/inbox', { params })
    return response.data
  },
  
  getStats: async (): Promise<InboxStats> => {
    const response = await apiClient.get('/notifications/inbox/stats')
    return response.data
  },
  
  markAsRead: async (itemId: number): Promise<void> => {
    await apiClient.post(`/notifications/inbox/${itemId}/read`)
  },
  
  markAllAsRead: async (): Promise<void> => {
    await apiClient.post('/notifications/inbox/read-all')
  },
}

// ============ 用户服务 ============

export const userService = {
  list: async (params?: {
    role_level?: number
    search?: string
    skip?: number
    limit?: number
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get('/users', { params })
    return response.data
  },
  
  get: async (id: number): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`)
    return response.data
  },
  
  getMe: async (): Promise<User> => {
    const response = await apiClient.get('/users/me')
    return response.data
  },
  
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.put('/users/me', data)
    return response.data
  },
  
  getMyTags: async (targetUserId?: number): Promise<any[]> => {
    const params = targetUserId ? { target_user_id: targetUserId } : {}
    const response = await apiClient.get('/users/me/tags', { params })
    return response.data
  },
  
  addTag: async (targetUserId: number, tag: string): Promise<any> => {
    const response = await apiClient.post('/users/me/tags', { target_user_id: targetUserId, tag })
    return response.data
  },
  
  getMyNotes: async (targetUserId?: number): Promise<any[]> => {
    const params = targetUserId ? { target_user_id: targetUserId } : {}
    const response = await apiClient.get('/users/me/notes', { params })
    return response.data
  },
  
  addNote: async (targetUserId: number, content: string): Promise<any> => {
    const response = await apiClient.post('/users/me/notes', { target_user_id: targetUserId, content })
    return response.data
  },
}

// ============ 管理员服务 ============

export const adminService = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/admin/dashboard/stats')
    return response.data
  },
  
  getPendingTransactions: async (): Promise<TokenTransaction[]> => {
    const response = await apiClient.get('/token/admin/pending')
    return response.data
  },
  
  approveTransaction: async (txId: number, comment?: string): Promise<void> => {
    await apiClient.post(`/token/admin/transactions/${txId}/approve`, { comment })
  },
  
  rejectTransaction: async (txId: number, comment: string): Promise<void> => {
    await apiClient.post(`/token/admin/transactions/${txId}/reject`, { comment })
  },
  
  grantToken: async (data: {
    user_id: number
    amount: number
    reason: string
    related_project_id?: number
  }): Promise<TokenTransaction> => {
    const response = await apiClient.post('/token/admin/grant', data)
    return response.data
  },
  
  deductToken: async (data: {
    user_id: number
    amount: number
    reason: string
    related_project_id?: number
  }): Promise<TokenTransaction> => {
    const response = await apiClient.post('/token/admin/deduct', data)
    return response.data
  },
  
  createDividend: async (data: {
    project_id: number
    recipients: { user_id: number; amount: number; note?: string }[]
    description: string
  }): Promise<TokenTransaction[]> => {
    const response = await apiClient.post('/token/admin/dividend', data)
    return response.data
  },
  
  reviewProject: async (projectId: number, approved: boolean, comment?: string): Promise<void> => {
    await apiClient.post(`/projects/${projectId}/review`, { approved, comment })
  },
}

// ============ 新闻类型 ============

export interface News {
  id: number
  title: string
  content?: string
  summary?: string
  source_name?: string
  source_url?: string
  publish_time?: string
  author?: string
  tags: string[]
  is_internal: boolean
  visibility_scope_type: string
  visibility_min_role_level?: number
  created_by_user_id: number
  created_by_name: string
  created_at: string
  updated_at: string
  project_ids: number[]
}

// ============ 新闻服务 ============

export const newsService = {
  list: async (params?: {
    project_id?: number
    tag?: string
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<News>> => {
    const response = await apiClient.get('/news', { params })
    return response.data
  },
  
  get: async (id: number): Promise<News> => {
    const response = await apiClient.get(`/news/${id}`)
    return response.data
  },
  
  create: async (data: {
    title: string
    content?: string
    summary?: string
    source_name?: string
    source_url?: string
    publish_time?: string
    author?: string
    tags?: string[]
    project_ids?: number[]
    visibility_scope_type?: string
    visibility_min_role_level?: number
  }): Promise<News> => {
    const response = await apiClient.post('/news', data)
    return response.data
  },
  
  update: async (id: number, data: Partial<News>): Promise<News> => {
    const response = await apiClient.put(`/news/${id}`, data)
    return response.data
  },
  
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/news/${id}`)
  },
  
  linkToProject: async (newsId: number, projectId: number): Promise<void> => {
    await apiClient.post(`/news/${newsId}/link-project`, null, { params: { project_id: projectId } })
  },
}

// ============ 公告类型 ============

export interface Announcement {
  id: number
  title: string
  content: string
  attachments?: any[]
  created_by_user_id: number
  created_by_name?: string
  visibility_scope_type: string
  visibility_min_role_level?: number
  created_at: string
  updated_at: string
}

// ============ 公告服务 ============

export const announcementService = {
  list: async (params?: {
    skip?: number
    limit?: number
  }): Promise<PaginatedResponse<Announcement>> => {
    const response = await apiClient.get('/notifications/announcements', { params })
    return response.data
  },

  get: async (id: number): Promise<Announcement> => {
    const response = await apiClient.get(`/notifications/announcements/${id}`)
    return response.data
  },

  create: async (data: {
    title: string
    content: string
    attachments?: any[]
    visibility_scope_type?: string
    visibility_min_role_level?: number
  }): Promise<Announcement> => {
    const response = await apiClient.post('/notifications/announcements', data)
    return response.data
  },

  update: async (id: number, data: Partial<Announcement>): Promise<Announcement> => {
    const response = await apiClient.put(`/notifications/announcements/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/notifications/announcements/${id}`)
  },
}

// ============ 审计日志类型 ============

export interface AuditLog {
  id: number
  user_id: number
  user_name?: string
  action: string
  object_type: string
  object_id: number
  summary: string
  created_at: string
}

// ============ 审计日志服务 ============

export const auditLogService = {
  list: async (params?: {
    user_id?: number
    action?: string
    object_type?: string
    start_time?: string
    end_time?: string
    skip?: number
    limit?: number
  }): Promise<PaginatedResponse<AuditLog>> => {
    const response = await apiClient.get('/admin/audit-logs', { params })
    return response.data
  },

  getActions: async (): Promise<{ actions: string[] }> => {
    const response = await apiClient.get('/admin/audit-logs/actions')
    return response.data
  },

  getObjectTypes: async (): Promise<{ object_types: string[] }> => {
    const response = await apiClient.get('/admin/audit-logs/object-types')
    return response.data
  },
}


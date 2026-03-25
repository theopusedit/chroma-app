// src/supabase.js
// Supabase 연결 + 모든 데이터 함수

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

export default supabase;

// ── 인증 ─────────────────────────────────────────────────────

// 회원가입
export async function signUp(email, password, username) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  // 프로필 생성
  await supabase.from('profiles').insert({
    id: data.user.id,
    username,
    display_name: username,
  });

  return data.user;
}

// 로그인
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

// 로그아웃
export async function signOut() {
  await supabase.auth.signOut();
}

// 현재 로그인된 유저
export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

// ── 프로필 ────────────────────────────────────────────────────

// 내 프로필 가져오기
export async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

// 프로필 수정
export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
}

// 팔로워/팔로잉 수 가져오기
export async function getFollowCounts(userId) {
  const [followers, following] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact' }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact' }).eq('follower_id', userId),
  ]);
  return {
    followers: followers.count || 0,
    following: following.count || 0,
  };
}

// ── 기록 ─────────────────────────────────────────────────────

// 기록 저장 (새로 쓰거나 수정)
export async function saveRecord(userId, track, data) {
  const payload = {
    user_id: userId,
    track_id: String(track.id || track.itunesId || ''),
    track_title: track.t,
    artist: track.ar,
    album: track.al || '',
    cover_url: track.coverUrl || track.coverSmUrl || '',
    rating: data.rating,
    memo: data.memo,
    listened_date: data.date,
    is_public: data.isPublic,
  };

  // 이미 기록이 있으면 수정, 없으면 새로 생성
  const { data: existing } = await supabase
    .from('records')
    .select('id')
    .eq('user_id', userId)
    .eq('track_id', payload.track_id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('records')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  } else {
    const { data: newRecord, error } = await supabase
      .from('records')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return newRecord.id;
  }
}

// 기록 삭제
export async function deleteRecord(userId, trackId) {
  await supabase
    .from('records')
    .delete()
    .eq('user_id', userId)
    .eq('track_id', String(trackId));
}

// 내 기록 전체 가져오기
export async function getMyRecords(userId) {
  const { data } = await supabase
    .from('records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

// 특정 곡 기록 가져오기
export async function getTrackRecord(userId, trackId) {
  const { data } = await supabase
    .from('records')
    .select('*')
    .eq('user_id', userId)
    .eq('track_id', String(trackId))
    .single();
  return data;
}

// ── 피드 ─────────────────────────────────────────────────────

// 공개 기록 피드 (좋아요 순)
export async function getPublicFeed(limit = 20) {
  const { data } = await supabase
    .from('records')
    .select(`
      *,
      profiles(username, display_name),
      likes(count)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ── 좋아요 ────────────────────────────────────────────────────

// 좋아요 토글
export async function toggleLike(userId, recordId) {
  const { data: existing } = await supabase
    .from('likes')
    .select('*')
    .eq('user_id', userId)
    .eq('record_id', recordId)
    .single();

  if (existing) {
    await supabase.from('likes').delete()
      .eq('user_id', userId).eq('record_id', recordId);
    return false;
  } else {
    await supabase.from('likes').insert({ user_id: userId, record_id: recordId });
    return true;
  }
}

// 좋아요 수 가져오기
export async function getLikeCount(recordId) {
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact' })
    .eq('record_id', recordId);
  return count || 0;
}

// ── 리스트 ────────────────────────────────────────────────────

// 내 리스트 가져오기
export async function getMyLists(userId) {
  const { data } = await supabase
    .from('lists')
    .select(`*, list_tracks(count)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data || []).map(l => ({
    ...l,
    count: l.list_tracks?.[0]?.count || 0,
    gs: [0, 1, 2, 3], // 커버 그라디언트 (나중에 실제 커버로 교체)
  }));
}

// 리스트 만들기
export async function createList(userId, name) {
  const { data, error } = await supabase
    .from('lists')
    .insert({ user_id: userId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 리스트에 곡 추가
export async function addTrackToList(listId, track) {
  await supabase.from('list_tracks').upsert({
    list_id: listId,
    track_id: String(track.id || track.itunesId || ''),
    track_title: track.t,
    artist: track.ar,
    cover_url: track.coverUrl || '',
  });
}

// 리스트에서 곡 제거
export async function removeTrackFromList(listId, trackId) {
  await supabase.from('list_tracks').delete()
    .eq('list_id', listId).eq('track_id', String(trackId));
}

// 곡이 담긴 리스트 ID 목록
export async function getTrackLists(userId, trackId) {
  const { data: userLists } = await supabase
    .from('lists').select('id').eq('user_id', userId);
  if (!userLists?.length) return [];

  const listIds = userLists.map(l => l.id);
  const { data } = await supabase
    .from('list_tracks')
    .select('list_id')
    .eq('track_id', String(trackId))
    .in('list_id', listIds);
  return (data || []).map(d => d.list_id);
}

// 리스트 곡 일괄 저장 (리스트 담기 모달용)
export async function saveListAssignment(userId, trackId, track, selectedListIds, allLists) {
  const { data: userLists } = await supabase
    .from('lists').select('id').eq('user_id', userId);
  if (!userLists?.length) return;

  const allListIds = userLists.map(l => l.id);

  await Promise.all(allListIds.map(listId => {
    if (selectedListIds.includes(listId)) {
      return addTrackToList(listId, track);
    } else {
      return removeTrackFromList(listId, trackId);
    }
  }));
}

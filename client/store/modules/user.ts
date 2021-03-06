import { ActionContext } from 'vuex';
import request from '../../helper/request';
import { User, FriendInfo } from '../../interface/entity';
import Chat from '../../socket/chat';

declare let uni: any;

interface State {
  userInfo: User;
  friendsMap: Record<number, FriendInfo>;
  friends: {
    key: string; // 用户名首字母
    list: number[]
  }[];
}

const state: State = {
  userInfo: {} as User,
  friendsMap: {},
  friends: [],
};

const mutations = {
  SET_USER_INFO(state: State, payload: { userInfo: User }) {
    state.userInfo = payload.userInfo;
  },
  SET_USER_FRIENDS(state: State, payload: { friends: { key: string; list: FriendInfo[] }[] }) {
    const { friends } = payload;
    const map = {};
    const tmp = friends.map(item => {
      const { key, list } = item;
      return {
        key,
        list: list.map(l => {
          l.nickname = l.remark || l.nickname;
          map[l.friend_id] = l;
          return l.friend_id;
        }),
      }
    });
    state.friends = tmp;
    state.friendsMap = map;
  },
};

const actions = {
  async getFriendsList({ commit }: ActionContext<State, any>) {
    const [err, res] = await request({
      url: '/user/friends',
      method: 'get',
    });
    if (res && res.errno === 200) {
      commit('SET_USER_FRIENDS', { friends: res.data });
    }
  },
  async login({ commit, dispatch }: ActionContext<State, any>, { mobile, password}: { mobile: number, password: string }) {
    const [err, res] = await request({
      url: '/user/signIn',
      method: 'PUT',
      data: {
        mobile,
        password,
      }
    });
    if (res && res.errno === 200) {
      await dispatch('getFriendsList');
      commit('SET_USER_INFO', { userInfo: res.data });
      uni.setStorageSync('token', res.data.token);
      // 登陆成功后，建立ws连接
      Chat.setup();
      return {
        errno: 200,
        errmsg: '',
        data: res.data,
      };
    }
    return {
      errno: res && res.errno || 1,
      errmsg: res && res.errmsg || '网络错误',
      data: null,
    };
  },
  async autoLogin({ commit, dispatch }: ActionContext<State, any>) {
    const [err, res] = await request({
      url: '/user/info',
    });
    if (res && res.errno === 200) {
      await dispatch('getFriendsList');
      commit('SET_USER_INFO', { userInfo: res.data });
      // 登陆成功后，建立ws连接
      Chat.setup();
      return {
        errno: 200,
        errmsg: '',
        data: res.data,
      };
    }
    return {
      errno: res && res.errno || 1,
      errmsg: res && res.errmsg || '网络错误',
      data: null,
    };
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions
}

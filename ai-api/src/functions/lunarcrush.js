const fetchSocialData = async (token) => {
    try {
      const response = await axios.get(`https://lunarcrush.com/api4/public/topic/${token}/v1`, {
        headers: {
          'Authorization': `Bearer ${LUNARCRUSH_API_KEY}`
        }
      });
      return response.data?.data;
    } catch (error) {
      console.error('Error fetching social data:', error);
      return null;
    }
  };
  
  // Fetch coin list from LunarCrush
  const fetchCoinList = async (sort = 'social_dominance', filter = '', limit = 20) => {
    try {
      const response = await axios.get('https://lunarcrush.com/api4/public/coins/list/v2', {
        params: {
          sort,
          filter,
          limit
        },
        headers: {
          'Authorization': `Bearer ${LUNARCRUSH_API_KEY}`
        }
      });
      return response.data?.data;
    } catch (error) {
      console.error('Error fetching coin list:', error);
      return null;
    }
  };
  
  // Fetch topic news from LunarCrush
  const fetchTopicNews = async (topic) => {
    try {
      const response = await axios.get(`https://lunarcrush.com/api4/public/topic/${topic}/news/v1`, {
        headers: {
          'Authorization': `Bearer ${LUNARCRUSH_API_KEY}`
        }
      });
      return response.data?.data;
    } catch (error) {
      console.error('Error fetching topic news:', error);
      return null;
    }
  };
  module.exports = {
    fetchSocialData,
    fetchCoinList,
    fetchTopicNews
  };   
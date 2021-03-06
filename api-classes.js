const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/**
 * This class maintains the list of individual Story instances
 *  It also has some methods for fetching, adding, and removing stories
 */
class StoryList {
  constructor(stories) {
    this.stories = stories;
  }
  // method to get the storylist. calls the API, builds an array of story instances, make single storylist instance out of it, and returns the storylist instance. static method would be called directly on the class itself
  static async getStories() {
    // query the /stories endpoint (no auth required)
    const response = await axios.get(`${BASE_URL}/stories`);

    // turn the stories object into an instance of Story for easier reading
    const stories = response.data.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    const storyList = new StoryList(stories);
    return storyList;
  }
  // method to make a post request and add new story to the list. returns new story object
  async addStory(user, newStory) {
    const response = await axios({
      method: "POST",
      url: `${BASE_URL}/stories`,
      data: {
        // request body
        // this is the format specified by the API
        token: user.loginToken,
        story: newStory,
      }
    });
    // make a Story instance out of the story object we get back
    newStory = new Story(response.data.story);
    // add the story to the beginning of the list
    this.stories.unshift(newStory);
    // add the story to the beginning of the user's list
    user.ownStories.unshift(newStory);

    return newStory;
  }
  // method to make delete request to remove a story
  async removeStory(user, storyId) {
    await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: "DELETE",
      data: {
        token: user.loginToken
      },
    });

    // filter out the story whose ID we are removing
    this.stories = this.stories.filter(story => story.storyId !== storyId);

    // do the same thing for the user's list of stories
    user.ownStories = user.ownStories.filter(s => s.storyId !== storyId
    );
  }
}

/**
 * The User class to primarily represent the current user.
 *  There are helper methods to signup (create), login, and getLoggedInUser
 */
class User {
  constructor(userObj) {
    this.username = userObj.username;
    this.name = userObj.name;
    this.createdAt = userObj.createdAt;
    this.updatedAt = userObj.updatedAt;
    this.loginToken = "";
    this.favorites = [];
    this.ownStories = [];
  }
  // create and return a new user
  static async create(username, password, name) {
    const response = await axios.post(`${BASE_URL}/signup`, {
      user: {
        username,
        password,
        name,
      }
    });
    // build a new User instance from the API response
    const newUser = new User(response.data.user);
    // attach the token to the newUser instance for convenience
    newUser.loginToken = response.data.token;

    return newUser;
  }

  // Login user and return user instance
  static async login(username, password) {
    const response = await axios.post(`${BASE_URL}/login`, {
      user: {
        username,
        password,
      }
    });
    // build a new User instance from the API response
    const existingUser = new User(response.data.user);
    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
    existingUser.ownStories = response.data.user.stories.map(s => new Story(s));
    // attach the token to the newUser instance for convenience
    existingUser.loginToken = response.data.token;

    return existingUser;
  }

  // get logged in user info
  static async getLoggedInUser(token, username) {
    // if we don't have user info, return null
    if (!token || !username) return null;

    // call the API
    const response = await axios.get(`${BASE_URL}/users/${username}`, {
      params: {token}
    });

    // instantiate the user from the API information
    const existingUser = new User(response.data.user);

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = token;

    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
    existingUser.ownStories = response.data.user.stories.map(s => new Story(s));

    return existingUser;
  }

  // retrieves user details. data, favorites, own stories
  async retrieveDetails() {
    const response = await axios.get(`${BASE_URL}/users/${this.username}`, {
      params: {
        token: this.loginToken
      }
    });

    // update all of the user's properties from the API response
    this.name = response.data.user.name;
    this.createdAt = response.data.user.createdAt;
    this.updatedAt = response.data.user.updatedAt;

    // remember to convert the user's favorites and ownStories into instances of Story
    this.favorites = response.data.user.favorites.map(s => new Story(s));
    this.ownStories = response.data.user.stories.map(s => new Story(s));

    return this;
  }

  // add story to favorites
  addFavorite(storyId) {
    return this._toggleFavorite(storyId, "POST");
  }

 // remove story from favorites
  removeFavorite(storyId) {
    return this._toggleFavorite(storyId, "DELETE");
  }

  /**
   * A helper method to either POST or DELETE to the API
   * - httpVerb: POST or DELETE based on adding or removing
   */
  async _toggleFavorite(storyId, httpVerb) {
    await axios({
      url: `${BASE_URL}/users/${this.username}/favorites/${storyId}`,
      method: httpVerb,
      data: {
        token: this.loginToken
      }
    });

    await this.retrieveDetails();
    return this;
  }

  // send a patch request to update the user's data
  async update(userData) {
    const response = await axios({
      url: `${BASE_URL}/users/${this.username}`,
      method: "PATCH",
      data: {
        user: userData,
        token: this.loginToken
      }
    });

    // "name" is really the only property you can update
    this.name = response.data.user.name;

    // Note: you can also update "password" but we're not storing it
    return this;
  }

  /**
   * Send a DELETE request to the API in order to remove the user
   */

  async remove() {
    // this function is really just a wrapper around axios
    await axios({
      url: `${BASE_URL}/users/${this.username}`,
      method: "DELETE",
      data: {
        token: this.loginToken
      }
    });
  }
}

// class to represent a single story
class Story {
  /**
   * The constructor is designed to take an object for better readability / flexibility
   * - storyObj: an object that has story properties in it
   */
  constructor(storyObj) {
    this.author = storyObj.author;
    this.title = storyObj.title;
    this.url = storyObj.url;
    this.username = storyObj.username;
    this.storyId = storyObj.storyId;
    this.createdAt = storyObj.createdAt;
    this.updatedAt = storyObj.updatedAt;
  }

  // make patch request to update a story
  async update(user, storyData) {
    const response = await axios({
      url: `${BASE_URL}/stories/${this.storyId}`,
      method: "PATCH",
      data: {
        token: user.loginToken,
        story: storyData
      }
    });

    const { author, title, url, updatedAt } = response.data.story;

    // these are the only fields that you can change with a PATCH update
    //  so we don't need to worry about updating the others
    this.author = author;
    this.title = title;
    this.url = url;
    this.updatedAt = updatedAt;

    return this;
  }
}
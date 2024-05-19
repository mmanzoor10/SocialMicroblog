const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');

const app  = express();
app.use(bodyParser.json());
app.use(cors());

const EVENT_BUS_API_ENDPOINT = 'http://event-bus-srv:4005/events';

const commentsByPostId = {};

app.get('/posts/:id/comments', (request, response) => {
  response.send(commentsByPostId[request.params.id] || []);
});

app.post('/posts/:id/comments', async (request, response) => {
  const commentID = randomBytes(4).toString('hex');
  const { content } = request.body;

  const comments = commentsByPostId[request.params.id] || [];

  comments.push({ id: commentID, content, status: 'pending' });
  commentsByPostId[request.params.id] = comments;

  await axios.post(EVENT_BUS_API_ENDPOINT, {
    type: 'CommentCreated',
    data: {
      id: commentID,
      content,
      postId: request.params.id,
      status: 'pending',
    },
  });

  response.status(201).send(comments);
});

app.post('/events', async (request, response) => {
  console.log('Event Received: ', request.body.type);

  const { type, data } = request.body;

  if (type === 'CommentModerated') {
    const { postId, id, status, content } = data;
    const comments = commentsByPostId[postId];

    const comment = comments.find((comment) => {
      return comment.id === id;
    })
    comment.status = status;

    await axios.post(EVENT_BUS_API_ENDPOINT, {
      type: 'CommentUpdated',
      data: {
        id,
        status,
        postId,
        content
      }
    })
  }

  response.send({});
});

app.listen(4001, () => {
  console.log('listening on 4001');
});

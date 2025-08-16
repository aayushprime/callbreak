# Room Service for super fast game development

This is the room service that saves every game idea from dying in the dark because of stupid WebSocket issues.


# Guidelines
The output of this is two main components. The server and the client library.

- Client library must be simple. (Easy to implement in non JS environments )

Messages are json serializable (for maximum compatibility)

messages are of two types.
- room message
- game message

# Room message list (not complete)
- welcome
- existing_player_list
- player_joined
- player_left
- game_started
- room_closed
- player_kicked 
- chat_message/system message (eg. message: room is set to private mode)

# Room messages available for only the host to send
- create_room [beginning of the room]
- kick_player
- start_game

# Game message
- game related message (customizable)

I think the Game abstract class from game.ts is good.


P.S. Cloudflare has something called durable objects, some serverless websocket thing, that we can probably use to take the server online without paying for a VPS. Ignore the index.ts, wrangler.jsonc, worker-configration.d.ts. Or dont your call.

export interface ClientMessage<T = any> {
	scope: 'room' | 'game';
	type: string; // e.g., 'startGame', 'makeMove'
	payload: T;
}

export interface ServerMessage<T = any> {
	scope: 'room' | 'game';
	type: string; // e.g., 'gameStateUpdate', 'playerJoined'
	payload: T;
}

export class Player {
	// We add a 'transient' property to hold the WebSocket connection
	// without it being part of the core Player identity.
	// It's managed by the Network Layer.
	public connection: any | null = null;

	constructor(
		public readonly id: string,
		public readonly name: string,
		public readonly country: string,
	) {}

	toSerializable() {
		return {
			id: this.id,
			name: this.name,
			country: this.country,
			picture: `https://www.gravatar.com/avatar/${this.id}?d=identicon`,
		};
	}
}

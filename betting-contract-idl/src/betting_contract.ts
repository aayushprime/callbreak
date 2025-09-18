/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/betting_contract.json`.
 */
export type BettingContract = {
  "address": "2khahbrpiyR493ecYb341kS5hajTq6GGVbzDDasBGThg",
  "metadata": {
    "name": "bettingContract",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "closeMatch",
      "discriminator": [
        79,
        174,
        36,
        80,
        233,
        185,
        176,
        239
      ],
      "accounts": [
        {
          "name": "host",
          "writable": true,
          "signer": true,
          "relations": [
            "matchAccount"
          ]
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "string"
        }
      ]
    },
    {
      "name": "createMatch",
      "discriminator": [
        107,
        2,
        184,
        145,
        70,
        142,
        17,
        165
      ],
      "accounts": [
        {
          "name": "host",
          "writable": true,
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
          "type": "string"
        },
        {
          "name": "roomFeeAmount",
          "type": "u64"
        },
        {
          "name": "rake",
          "type": "u64"
        },
        {
          "name": "numPlayers",
          "type": "u8"
        }
      ]
    },
    {
      "name": "joinMatch",
      "discriminator": [
        244,
        8,
        47,
        130,
        192,
        59,
        179,
        44
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "string"
        }
      ]
    },
    {
      "name": "leaveMatch",
      "discriminator": [
        199,
        14,
        16,
        91,
        104,
        95,
        166,
        15
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "string"
        }
      ]
    },
    {
      "name": "settleMatch",
      "discriminator": [
        71,
        124,
        117,
        96,
        191,
        217,
        116,
        24
      ],
      "accounts": [
        {
          "name": "host",
          "writable": true,
          "signer": true,
          "relations": [
            "matchAccount"
          ]
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "string"
        },
        {
          "name": "winnerIndex",
          "type": "i8"
        }
      ]
    },
    {
      "name": "startMatch",
      "discriminator": [
        100,
        246,
        223,
        181,
        176,
        101,
        255,
        19
      ],
      "accounts": [
        {
          "name": "host",
          "writable": true,
          "signer": true,
          "relations": [
            "matchAccount"
          ]
        },
        {
          "name": "matchAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "matchId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "matchAccount",
      "discriminator": [
        235,
        36,
        243,
        39,
        81,
        16,
        144,
        87
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidPlayers",
      "msg": "Invalid number of players"
    },
    {
      "code": 6001,
      "name": "idTooLong",
      "msg": "Match ID too long"
    },
    {
      "code": 6002,
      "name": "matchNotOpen",
      "msg": "Match is not open"
    },
    {
      "code": 6003,
      "name": "notAPlayer",
      "msg": "Player is not part of this match"
    },
    {
      "code": 6004,
      "name": "alreadyFunded",
      "msg": "Player already funded"
    },
    {
      "code": 6005,
      "name": "invalidAmount",
      "msg": "Amount must equal room fee"
    },
    {
      "code": 6006,
      "name": "notAllFunded",
      "msg": "Not all players have funded yet"
    },
    {
      "code": 6007,
      "name": "matchNotActive",
      "msg": "Match not active"
    },
    {
      "code": 6008,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6009,
      "name": "accountsOverlap",
      "msg": "Cannot withdraw to match account"
    },
    {
      "code": 6010,
      "name": "invalidWinner",
      "msg": "Invalid winner index"
    },
    {
      "code": 6011,
      "name": "winnerMismatch",
      "msg": "Winner account mismatch"
    },
    {
      "code": 6012,
      "name": "nothingToPayout",
      "msg": "Nothing to payout"
    },
    {
      "code": 6013,
      "name": "cannotRefund",
      "msg": "Cannot refund in current state"
    },
    {
      "code": 6014,
      "name": "playerMismatchForRefund",
      "msg": "Player account mismatch during refund"
    },
    {
      "code": 6015,
      "name": "insufficientFunds",
      "msg": "Insufficient funds to join match"
    },
    {
      "code": 6016,
      "name": "matchNotSettledOrRefunded",
      "msg": "Match must be settled or refunded to be closed"
    }
  ],
  "types": [
    {
      "name": "matchAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "host",
            "type": "pubkey"
          },
          {
            "name": "id",
            "type": "string"
          },
          {
            "name": "roomFee",
            "type": "u64"
          },
          {
            "name": "rake",
            "type": "u64"
          },
          {
            "name": "players",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "deposits",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "maxPlayers",
            "type": "u8"
          }
        ]
      }
    }
  ]
};

"use client";

type PlayerData = {
  name: string;
  results: number[];
};

export const Books = ({ onClose }: { onClose: () => void }) => {
  const players: PlayerData[] = [
    { name: "P1", results: [1.2, 2.0, 1.5, 3.0, 2.5] },
    { name: "P2", results: [1.0, 1.5, 2.0, 2.0, 1.5] },
    { name: "P3", results: [0.5, 1.0, 1.5, 2.5, 3.0] },
    { name: "P4", results: [2.0, 2.5, 1.0, 1.5, 2.0] },
  ];

  const totalRounds = players[0].results.length;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Darker, semi-transparent background */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md"></div>

      {/* Popup with a darker theme */}
      <div className="relative bg-green-800 rounded-3xl shadow-lg border border-green-600 p-6 w-[95%] max-w-5xl text-white">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-green-200 font-bold text-xl hover:text-white"
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Books
        </h2>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-green-600 border-collapse text-center">
            <thead>
              <tr className="bg-green-700">
                <th className="px-4 py-2 border border-green-600">Round</th>
                {players.map((p) => (
                  <th
                    key={p.name}
                    className="px-4 py-2 border border-green-600 text-green-200"
                  >
                    {p.name}
                  </th>
                ))}
                <th className="px-4 py-2 border border-green-600 text-green-200">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: totalRounds }, (_, rIdx) => {
                const roundTotal = players.reduce(
                  (acc, p) => acc + p.results[rIdx],
                  0
                );
                return (
                  <tr
                    key={rIdx}
                    className={
                      rIdx % 2 === 0 ? "bg-green-700/50" : "bg-green-800"
                    }
                  >
                    <td className="px-4 py-2 border border-green-600 font-semibold">
                      {rIdx + 1}
                    </td>
                    {players.map((p) => (
                      <td
                        key={`${p.name}-r${rIdx}`}
                        className="px-4 py-2 border border-green-600"
                      >
                        {p.results[rIdx].toFixed(1)}
                      </td>
                    ))}
                    <td className="px-4 py-2 border border-green-600 font-bold">
                      {roundTotal.toFixed(1)}
                    </td>
                  </tr>
                );
              })}

              {/* Optional: Total row summing all rounds */}
              <tr className="bg-green-700 font-bold">
                <td className="px-4 py-2 border border-green-600">Total</td>
                {players.map((p) => {
                  const total = p.results.reduce((acc, r) => acc + r, 0);
                  return (
                    <td
                      key={p.name}
                      className="px-4 py-2 border border-green-600"
                    >
                      {total.toFixed(1)}
                    </td>
                  );
                })}
                <td className="px-4 py-2 border border-green-600">
                  {players
                    .reduce(
                      (acc, p) => acc + p.results.reduce((a, r) => a + r, 0),
                      0
                    )
                    .toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { driveAccountsApi } from "../services/api";
import type { DriveAccount } from "../services/api";
import GoogleDriveLoginButton from "../components/GoogleDriveLoginButton";

export default function DriveAccountsPage() {
  const [accounts, setAccounts] = useState<DriveAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadAccounts();

    // Show success/error message from OAuth callback
    if (searchParams.get("success") === "true") {
      alert("Google Drive connected successfully!");
      window.history.replaceState({}, "", "/accounts");
      loadAccounts();
    } else if (searchParams.get("error") === "true") {
      alert("Failed to connect Google Drive. Please try again.");
      window.history.replaceState({}, "", "/accounts");
    }
  }, [searchParams]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const { data } = await driveAccountsApi.listAccounts();
      setAccounts(data);
    } catch (error) {
      console.error("Failed to load accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this account?")) return;

    try {
      await driveAccountsApi.removeAccount(id);
      setAccounts(accounts.filter((acc) => acc.id !== id));
    } catch (error) {
      console.error("Failed to remove account:", error);
      alert("Failed to remove account");
    }
  };

  const formatBytes = (bytes: string) => {
    const num = parseInt(bytes);
    const gb = num / 1024 ** 3;
    return gb.toFixed(2) + " GB";
  };

  const getUsagePercent = (used: string, total: string) => {
    const usedNum = parseInt(used);
    const totalNum = parseInt(total);
    return ((usedNum / totalNum) * 100).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Google Drive Accounts
          </h1>
          <p className="text-gray-600">
            Connect your Google Drive accounts to aggregate storage
          </p>
        </div>

        <div className="mb-6">
          <GoogleDriveLoginButton />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No accounts connected yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Click the button above to connect your first Google Drive account
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {account.email}
                    </h3>
                    <span
                      className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                        account.status === "online"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {account.status}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemove(account.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Storage Usage</span>
                    <span>
                      {formatBytes(account.usedSpace)} /{" "}
                      {formatBytes(account.totalSpace)} (
                      {getUsagePercent(account.usedSpace, account.totalSpace)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${getUsagePercent(account.usedSpace, account.totalSpace)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api";
import BankCard from "../components/bankcard";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface Account {
  id: string;
  accountNumber: string;
  balance: string;
  createdAt: string;
}

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: string;
  description: string | null;
  createdAt: string;
  fromAccountId: string | null;
  toAccountId: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PixKey {
  id: string;
  type: string;
  key: string;
  createdAt: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

interface VirtualCard {
  id: string;
  lastFour: string;
  holderName: string;
  expiryMonth: number;
  expiryYear: number;
  status: "ACTIVE" | "BLOCKED";
  createdAt: string;
  updatedAt: string;
}

interface SecurityActivity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  userId: string;
}

type TransactionFilter =
  | "ALL"
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "PIX"
  | "TRANSFER";

  type PeriodFilter = "TODAY" | "7_DAYS" | "30_DAYS" | "ALL";

function isTransactionFilter(value: string): value is TransactionFilter {
  return (
    value === "ALL" ||
    value === "DEPOSIT" ||
    value === "WITHDRAWAL" ||
    value === "PIX" ||
    value === "TRANSFER"
  );
}

function isPeriodFilter(value: string): value is PeriodFilter {
  return (
    value === "TODAY" ||
    value === "7_DAYS" ||
    value === "30_DAYS" ||
    value === "ALL"
  );
}

interface PixKey {
  id: string;
  type: string;
  key: string;
  createdAt: string;
}

function getPeriodStartDate(period: PeriodFilter): string | undefined {
  const now = new Date();

  if (period === "ALL") {
    return undefined;
  }

  const startDate = new Date(now);

  if (period === "TODAY") {
    startDate.setHours(0, 0, 0, 0);
  } else {
    const days = period === "7_DAYS" ? 7 : 30;

    startDate.setDate(startDate.getDate() - days);
  }

  return startDate.toISOString();
}

interface DashboardProps {
  onLogout: () => void;
}

function Dashboard({ onLogout }: DashboardProps) {
  const [account, setAccount] = useState<Account | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pixKeys, setPixKeys] = useState<PixKey[]>([]);
  const [virtualCard, setVirtualCard] = useState<VirtualCard | null>(null);
  const [virtualCardLoading, setVirtualCardLoading] = useState(true);
  const [virtualCardError, setVirtualCardError] = useState("");
  const [virtualCardActionLoading, setVirtualCardActionLoading] = useState(false);
  const [virtualCardMessage, setVirtualCardMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  const [securityActivities, setSecurityActivities] = useState<SecurityActivity[]>([]);
const [securityLoading, setSecurityLoading] = useState(false);
const [securityError, setSecurityError] = useState("");

  const [amount, setAmount] = useState("");
  const [operationLoading, setOperationLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [transferAccount, setTransferAccount] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMessage, setTransferMessage] = useState("");
  const [transferError, setTransferError] = useState("");

  const [transactionFilter, setTransactionFilter] =
  useState<TransactionFilter>("ALL");
  const [periodFilter, setPeriodFilter] =
  useState<PeriodFilter>("ALL");
  const [periodReferenceDate] = useState(() => new Date());

  const [pixKey, setPixKey] = useState("");
  const [pixAmount, setPixAmount] = useState("");
  const [pixLoading, setPixLoading] = useState(false);
  const [pixMessage, setPixMessage] = useState("");
  const [pixError, setPixError] = useState("");

  const [newPixKey, setNewPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("EMAIL");
  const [pixKeyLoading, setPixKeyLoading] = useState(false);
  const [pixKeyMessage, setPixKeyMessage] = useState("");
  const [pixKeyError, setPixKeyError] = useState("");
  const [searchTransaction, setSearchTransaction] = useState("");

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [paginationError, setPaginationError] = useState("");

  const [profileName, setProfileName] = useState("");
const [profileEmail, setProfileEmail] = useState("");
const [profileLoading, setProfileLoading] = useState(false);
const [profileMessage, setProfileMessage] = useState("");
const [profileError, setProfileError] = useState("");

const [currentPassword, setCurrentPassword] = useState("");
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [passwordLoading, setPasswordLoading] = useState(false);
const [passwordMessage, setPasswordMessage] = useState("");
const [passwordError, setPasswordError] = useState("");

  async function handleExportStatement() {
    try {
      const token = localStorage.getItem("silver_token");

      const params = new URLSearchParams();

  if (transactionFilter !== "ALL") {
    params.set("type", transactionFilter);
}

    const startDate = getPeriodStartDate(periodFilter);

  if (startDate) {
    params.set("startDate", startDate);
}

  if (searchTransaction.trim()) {
    params.set("search", searchTransaction.trim());
}

      if (!token) {
        throw new Error("Você precisa estar autenticado.");
      }

      const response = await fetch(
        `http://localhost:3001/api/accounts/statement/pdf?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Não foi possível exportar o extrato.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "silver-bank-extrato.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao exportar o extrato."
      );
    }
  }

  const filteredTransactions = useMemo(() => {
    if (transactionFilter === "ALL") {
      return transactions;
    }

    return transactions.filter(
      (transaction) => transaction.type === transactionFilter
    );
  }, [transactions, transactionFilter]);

  const periodFilteredTransactions = useMemo(() => {
  const now = periodReferenceDate;

  return filteredTransactions.filter((transaction) => {
    const transactionDate = new Date(transaction.createdAt);

    if (periodFilter === "ALL") {
      return true;
    }

    if (periodFilter === "TODAY") {
      return (
        transactionDate.getDate() === now.getDate() &&
        transactionDate.getMonth() === now.getMonth() &&
        transactionDate.getFullYear() === now.getFullYear()
      );
    }

    const days = periodFilter === "7_DAYS" ? 7 : 30;

    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days);

    return transactionDate >= startDate;
  });
}, [filteredTransactions, periodFilter, periodReferenceDate]);

    const searchedTransactions = useMemo(() => {
      const search = searchTransaction.trim().toLowerCase();

      if (!search) {
        return periodFilteredTransactions;
      }

      return periodFilteredTransactions.filter((transaction) => {
        const description = transaction.description || "";
        const type = formatTransactionType(transaction.type);

        return (
          description.toLowerCase().includes(search) ||
          type.toLowerCase().includes(search)
        );
      });
    }, [periodFilteredTransactions, searchTransaction]);

  const financialSummary = useMemo(() => {
  if (!account) {
    return {
      income: 0,
      expenses: 0,
    };
  }

  let income = 0;
  let expenses = 0;

  transactions.forEach((transaction) => {
    if (transaction.status !== "COMPLETED") {
      return;
    }

    const amount = Number(transaction.amount);

    if (transaction.toAccountId === account.id) {
      income += amount;
    }

    if (transaction.fromAccountId === account.id) {
      expenses += amount;
    }
  });

  return {
    income,
    expenses,
  };
}, [account, transactions]);

  const chartData: { name: string; valor: number }[] = [
    { name: "Entradas", valor: financialSummary.income },
    { name: "Saídas", valor: financialSummary.expenses },
  ];

  const pieData: { name: string; value: number }[] = [
    { name: "Entradas", value: financialSummary.income },
    { name: "Saídas", value: financialSummary.expenses },
  ];

  const chartColors = ["#2ecc71", "#e74c3c"];

  async function loadDashboard(
  page = 1,
  filter = transactionFilter,
  period = periodFilter,
  search = searchTransaction
) {
    const token = localStorage.getItem("silver_token");

    if (!token) {
      throw new Error("Sessão não encontrada. Faça login novamente.");
    }

    const params = new URLSearchParams();
    params.set("page", String(page));

    if (search.trim()) {
  params.set("search", search.trim());
}

    if (filter !== "ALL") {
      params.set("type", filter);
    }

    const startDate = getPeriodStartDate(period);

    if (startDate) {
      params.set("startDate", startDate);
    }

    const [
  accountData,
  statementData,
  pixKeyData,
  userData,
  notificationData,
] = await Promise.all([
  apiRequest("/accounts", {}, token),
  apiRequest(`/accounts/statement?${params.toString()}`, {}, token),
  apiRequest("/accounts/pix-keys", {}, token),
  apiRequest("/auth/me", {}, token),
  apiRequest("/notifications", {}, token),
]);

    setAccount(accountData.account);
    setTransactions(statementData.transactions);
    setPixKeys(pixKeyData.pixKeys);
    setPagination(statementData.pagination);
    setUser(userData.user);
    setNotifications(notificationData.notifications);
    setUnreadCount(notificationData.unreadCount);
  }

  async function loadVirtualCard() {
  setVirtualCardLoading(true);
  setVirtualCardError("");

  try {
    const token = localStorage.getItem("silver_token");

    if (!token) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const result = await apiRequest("/virtual-card", {}, token);

    setVirtualCard(result.card);
  } catch (err) {
    setVirtualCardError(
      err instanceof Error
        ? err.message
        : "Não foi possível carregar o cartão virtual."
    );
  } finally {
    setVirtualCardLoading(false);
  }
}

async function handleToggleVirtualCard() {
  if (!virtualCard) {
    return;
  }

  setVirtualCardActionLoading(true);
  setVirtualCardMessage("");
  setVirtualCardError("");

  try {
    const token = localStorage.getItem("silver_token");

    if (!token) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const isBlocking = virtualCard.status === "ACTIVE";

    const endpoint = isBlocking
      ? "/virtual-card/block"
      : "/virtual-card/unblock";

    const result = await apiRequest(
      endpoint,
      { method: "PATCH" },
      token
    );

    setVirtualCard(result.card);

    setVirtualCardMessage(
      isBlocking
        ? "Cartão virtual bloqueado com sucesso."
        : "Cartão virtual desbloqueado com sucesso."
    );
  } catch (err) {
    setVirtualCardError(
      err instanceof Error
        ? err.message
        : "Não foi possível atualizar o cartão virtual."
    );
  } finally {
    setVirtualCardActionLoading(false);
  }
}

  async function loadNotifications() {
    setNotificationError("");
    setNotificationLoading(true);

    try {
      const token = localStorage.getItem("silver_token");

      if (!token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const result = await apiRequest("/notifications", {}, token);
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (err) {
      setNotificationError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar as notificações."
      );
    } finally {
      setNotificationLoading(false);
    }
  }

  async function loadSecurityActivities() {
  setSecurityError("");
  setSecurityLoading(true);

  try {
    const token = localStorage.getItem("silver_token");

    if (!token) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const result = await apiRequest(
      "/security-activities",
      {},
      token
    );

    setSecurityActivities(result.activities);
  } catch (err) {
    setSecurityError(
      err instanceof Error
        ? err.message
        : "Não foi possível carregar o histórico de segurança."
    );
  } finally {
    setSecurityLoading(false);
  }
}

  async function handleReadNotification(notification: Notification) {
    if (notification.readAt) {
      return;
    }

    setNotificationError("");
    setNotificationLoading(true);

    try {
      const token = localStorage.getItem("silver_token");

      if (!token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      await apiRequest(
        `/notifications/${encodeURIComponent(notification.id)}/read`,
        { method: "PATCH" },
        token
      );

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: new Date().toISOString() }
            : item
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setNotificationError(
        err instanceof Error
          ? err.message
          : "Não foi possível marcar a notificação como lida."
      );
    } finally {
      setNotificationLoading(false);
    }
  }

  async function handleReadAllNotifications() {
    setNotificationError("");
    setNotificationLoading(true);

    try {
      const token = localStorage.getItem("silver_token");

      if (!token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      await apiRequest(
        "/notifications/read-all",
        { method: "PATCH" },
        token
      );

      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, readAt }))
      );
      setUnreadCount(0);
    } catch (err) {
      setNotificationError(
        err instanceof Error
          ? err.message
          : "Não foi possível marcar todas as notificações como lidas."
      );
    } finally {
      setNotificationLoading(false);
    }
  }

  function handleToggleNotifications() {
    const opening = !notificationOpen;
    setNotificationOpen(opening);

    if (opening) {
      void loadNotifications();
    }
  }

  async function handlePageChange(page: number) {
    setPaginationError("");

    try {
      await loadDashboard(page);
    } catch (err) {
      setPaginationError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar esta página do extrato."
      );
    }
  }

  useEffect(() => {
    async function initializeDashboard() {
      try {
        await loadDashboard();
        void loadVirtualCard();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erro ao carregar os dados bancários."
        );
      } finally {
        setLoading(false);
      }

      void loadNotifications();
      void loadSecurityActivities();
    }

    initializeDashboard();
  }, []);

  useEffect(() => {
  if (user) {
    setProfileName(user.name);
    setProfileEmail(user.email);
  }
}, [user]);

async function handleUpdateProfile() {
  setProfileMessage("");
  setProfileError("");

  if (!profileName.trim() || !profileEmail.trim()) {
    setProfileError("Preencha todos os campos.");
    return;
  }

  try {
    setProfileLoading(true);

    const token = localStorage.getItem("silver_token");

    if (!token) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const result = await apiRequest(
      "/auth/profile",
      {
        method: "PUT",
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
        }),
      },
      token
    );

    setUser(result.user);
    setProfileMessage(result.message || "Perfil atualizado com sucesso!");
  } catch (error) {
    setProfileError(
      error instanceof Error
        ? error.message
        : "Erro ao atualizar perfil."
    );
  } finally {
    setProfileLoading(false);
  }
}

async function handleChangePassword() {
  setPasswordMessage("");
  setPasswordError("");

  if (!currentPassword || !newPassword || !confirmPassword) {
    setPasswordError("Preencha todos os campos de senha.");
    return;
  }

  if (newPassword.length < 8) {
    setPasswordError("A nova senha precisa ter pelo menos 8 caracteres.");
    return;
  }

  if (newPassword !== confirmPassword) {
    setPasswordError("A confirmação da nova senha não corresponde.");
    return;
  }

  try {
    setPasswordLoading(true);

    const token = localStorage.getItem("silver_token");

    if (!token) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const result = await apiRequest(
      "/auth/change-password",
      {
        method: "PUT",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      },
      token
    );

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage(result.message || "Senha alterada com sucesso!");
  } catch (error) {
    setPasswordError(
      error instanceof Error
        ? error.message
        : "Erro ao alterar a senha."
    );
  } finally {
    setPasswordLoading(false);
  }
}

  async function handleTransfer() {
    setTransferMessage("");
    setTransferError("");

    if (!/^\d{8}$/.test(transferAccount)) {
      setTransferError("Informe um número de conta válido com 8 dígitos.");
      return;
    }

    if (
      !transferAmount ||
      !/^\d+(\.\d{1,2})?$/.test(transferAmount) ||
      Number(transferAmount) <= 0
    ) {
      setTransferError("Informe um valor válido. Exemplo: 50.00");
      return;
    }

    try {
      setTransferLoading(true);

      const token = localStorage.getItem("silver_token");

      if (!token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const result = await apiRequest(
        "/accounts/transfer",
        {
          method: "POST",
          body: JSON.stringify({
            accountNumber: transferAccount,
            amount: transferAmount,
          }),
        },
        token
      );

      setTransferMessage(
        result.message || "Transferência realizada com sucesso!"
      );

      setTransferAccount("");
      setTransferAmount("");

      await loadDashboard();
    } catch (err) {
      setTransferError(
        err instanceof Error
          ? err.message
          : "Não foi possível realizar a transferência."
      );
    } finally {
      setTransferLoading(false);
    }
  }

  async function handlePix() {
  setPixMessage("");
  setPixError("");

  if (!pixKey.trim()) {
    setPixError("Informe a chave Pix do destinatário.");
    return;
  }

  if (
    !pixAmount ||
    !/^\d+(\.\d{1,2})?$/.test(pixAmount) ||
    Number(pixAmount) <= 0
  ) {
    setPixError("Informe um valor válido. Exemplo: 30.00");
    return;
  }

  try {
    setPixLoading(true);

    const token = localStorage.getItem("silver_token");

    if (!token) {
      throw new Error("Sessão não encontrada. Faça login novamente.");
    }

    const result = await apiRequest(
      "/accounts/pix",
      {
        method: "POST",
        body: JSON.stringify({
          key: pixKey.trim(),
          amount: pixAmount,
        }),
      },

      token
    );

    setPixMessage(
      result.message || "Pix realizado com sucesso!"
    );

    setPixKey("");
    setPixAmount("");

    await loadDashboard();
  } catch (err) {
    setPixError(
      err instanceof Error
        ? err.message
        : "Não foi possível realizar o Pix."
    );
  } finally {
    setPixLoading(false);
  }
}

  async function handleOperation(type: "deposit" | "withdraw") {
    setMessage("");
    setError("");

    if (!amount || !/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setError("Informe um valor válido. Exemplo: 150.00");
      return;
    }

    try {
      setOperationLoading(true);

      const token = localStorage.getItem("silver_token");

      if (!token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const result = await apiRequest(
        `/accounts/${type}`,
        {
          method: "POST",
          body: JSON.stringify({ amount }),
        },
        token
      );

      setMessage(
        result.message ||
          (type === "deposit"
            ? "Depósito realizado com sucesso!"
            : "Saque realizado com sucesso!")
      );

      setAmount("");

      await loadDashboard();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível realizar a operação."
      );
    } finally {
      setOperationLoading(false);
    }
  }

  async function handleCreatePixKey() {
    setPixKeyMessage("");
    setPixKeyError("");

    if (!newPixKey.trim()) {
      setPixKeyError("Informe uma chave Pix.");
      return;
    }

    try {
      setPixKeyLoading(true);

      const token = localStorage.getItem("silver_token");

      if (!token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const result = await apiRequest(
        "/accounts/pix-keys",
        {
          method: "POST",
          body: JSON.stringify({
            type: pixKeyType,
            key: newPixKey.trim(),
          }),
        },
        token
      );

      setPixKeyMessage(result.message || "Chave Pix cadastrada com sucesso!");
      setNewPixKey("");
      await loadDashboard();
    } catch (err) {
      setPixKeyError(
        err instanceof Error
          ? err.message
          : "Não foi possível cadastrar a chave Pix."
      );
    } finally {
      setPixKeyLoading(false);
    }
  }

  async function handleDeletePixKey(id: string) {
    setPixKeyMessage("");
    setPixKeyError("");

    if (!window.confirm("Tem certeza que deseja excluir esta chave Pix?")) {
      return;
    }

    try {
      setPixKeyLoading(true);

      const token = localStorage.getItem("silver_token");

      if (!token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const result = await apiRequest(
        `/accounts/pix-keys/${id}`,
        { method: "DELETE" },
        token
      );

      setPixKeyMessage(result.message || "Chave Pix excluída com sucesso!");
      await loadDashboard();
    } catch (err) {
      setPixKeyError(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir a chave Pix."
      );
    } finally {
      setPixKeyLoading(false);
    }
  }

  function formatCurrency(value: string) {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatTransactionType(type: string) {
    const types: Record<string, string> = {
      DEPOSIT: "Depósito",
      WITHDRAWAL: "Saque",
      TRANSFER: "Transferência",
      PIX: "Pix",
    };

    return types[type] || type;
  }

  if (loading) {
    return <div className="dashboard-loading">Carregando sua conta...</div>;
  }

  if (error && !account) {
    return <div className="dashboard-error">{error}</div>;
  }

  if (!account) {
    return <div className="dashboard-error">Conta não encontrada.</div>;
  }

  return (
  <div className="dashboard-layout">

    <aside className="sidebar">

  <div className="sidebar-brand">
    <div className="sidebar-logo">S</div>
    <h2>SILVER BANK</h2>
  </div>

  <nav className="sidebar-nav">
    <a href="#overview">Visão geral</a>
    <a href="#operations">Operações</a>
    <a href="#transfer">Transferências</a>
    <a href="#pix">Enviar Pix</a>
    <a href="#pix-keys">Minhas chaves Pix</a>
    <a href="#statement">Extrato bancário</a>
    <a href="#profile">Meu Perfil</a>
    <a href="#security">Central de Segurança</a>
  </nav>

  <div className="sidebar-footer">
    <span>{user?.name || "Usuário"}</span>
    <p>Silver Bank © 2026</p>

    <button
      type="button"
      className="logout-button"
      onClick={onLogout}
    >
      Sair da conta
    </button>
  </div>

</aside>

    <main className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>SILVER BANK</h1>
          <p>Bem-vindo ao seu banco digital.</p>
        </div>

        <div className="dashboard-header-actions">
          <span>{user?.name || "Usuário"}</span>
          <div className="notification-container">
            <button
              type="button"
              className="notification-button"
              aria-label={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ""}`}
              aria-expanded={notificationOpen}
              aria-controls="notification-panel"
              onClick={handleToggleNotifications}
            >
              <span aria-hidden="true">♢</span>
              {unreadCount > 0 && (
                <span className="notification-count">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <section
                className="notification-panel"
                id="notification-panel"
                aria-label="Notificações"
              >
                <div className="notification-panel-header">
                  <h2>Notificações</h2>
                  <button
                    type="button"
                    onClick={handleReadAllNotifications}
                    disabled={notificationLoading || unreadCount === 0}
                  >
                    Marcar todas como lidas
                  </button>
                </div>

                {notificationError && (
                  <p className="notification-error" role="alert">
                    {notificationError}
                  </p>
                )}

                {notificationLoading ? (
                  <p className="notification-empty">Carregando...</p>
                ) : notifications.length === 0 ? (
                  <p className="notification-empty">
                    Você não tem notificações.
                  </p>
                ) : (
                  <ul className="notification-list">
                    {notifications.map((notification) => (
                      <li key={notification.id}>
                        <button
                          type="button"
                          className={`notification-item${notification.readAt ? "" : " is-unread"}`}
                          onClick={() =>
                            void handleReadNotification(notification)
                          }
                          disabled={notificationLoading}
                        >
                          <span className="notification-item-title">
                            {notification.title}
                          </span>
                          <span>{notification.message}</span>
                          <time dateTime={notification.createdAt}>
                            {new Date(notification.createdAt).toLocaleString(
                              "pt-BR"
                            )}
                          </time>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        </div>
      </header>

      <div className="account-overview">
        
      
      <section className="balance-card" id="overview">
        <p>Saldo disponível</p>

        <h2>{formatCurrency(account.balance)}</h2>

        <p>Conta: {account.accountNumber}</p>
      </section>

      <div className="virtual-card-container">
        {virtualCardLoading ? (
          <p className="virtual-card-status">Carregando cartão virtual...</p>
        ) : virtualCard ? (
          <>
            <BankCard card={virtualCard} />
            <button
              type="button"
              className="virtual-card-action"
              onClick={handleToggleVirtualCard}
              disabled={virtualCardActionLoading}
            >
              {virtualCardActionLoading
                ? "Atualizando..."
                : virtualCard.status === "ACTIVE"
                  ? "Bloquear cartão"
                  : "Desbloquear cartão"}
            </button>
            {virtualCardMessage && (
              <p className="operation-success">{virtualCardMessage}</p>
            )}
            {virtualCardError && (
              <p className="operation-error" role="alert">
                {virtualCardError}
              </p>
            )}
          </>
        ) : (
          <p className="operation-error" role="alert">
            {virtualCardError || "Não foi possível carregar o cartão virtual."}
          </p>
        )}
      </div>
      </div>
      
      <section className="financial-section" id="financial">
  <div className="section-heading">
    <h2>Resumo financeiro</h2>
    <p>Acompanhe suas movimentações financeiras</p>
  </div>

  <div className="financial-summary">
    <div className="summary-card income-card">
      <span>Total de entradas</span>
      <h3>
        {financialSummary.income.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </h3>
    </div>

    <div className="summary-card expense-card">
      <span>Total de saídas</span>
      <h3>
        {financialSummary.expenses.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </h3>
    </div>
  </div>

  <div className="financial-charts">
    <div className="chart-card">
      <h3>Entradas x Saídas</h3>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />

          <XAxis dataKey="name" stroke="#aaa" />

          <YAxis stroke="#aaa" />

          <Tooltip
            formatter={(value) =>
              Number(value).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })
            }
          />

          <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={entry.name} fill={chartColors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div className="chart-card">
      <h3>Distribuição financeira</h3>

      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label
          >
            {pieData.map((entry, index) => (
              <Cell key={entry.name} fill={chartColors[index]} />
            ))}
          </Pie>

          <Tooltip
            formatter={(value) =>
              Number(value).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
</section>

      <section className="summary-section" aria-label="Resumo financeiro">
        <h2>Resumo financeiro</h2>

        <div className="summary-grid">
          <div className="summary-card">
            <span>Entradas</span>
            <strong>{formatCurrency(String(financialSummary.income))}</strong>
          </div>

          <div className="summary-card">
            <span>Saídas</span>
            <strong>{formatCurrency(String(financialSummary.expenses))}</strong>
          </div>
        </div>
      </section>

      <section className="operations-section" id="operations">
        <h2>Operações bancárias</h2>

        <div className="operation-card">
          <label htmlFor="amount">Valor da operação</label>

          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Ex: 150.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />

          <div className="operation-buttons">
            <button
              type="button"
              disabled={operationLoading}
              onClick={() => handleOperation("deposit")}
            >
              {operationLoading ? "Processando..." : "Depositar"}
            </button>

            <button
              type="button"
              className="withdraw-button"
              disabled={operationLoading}
              onClick={() => handleOperation("withdraw")}
            >
              {operationLoading ? "Processando..." : "Sacar"}
            </button>
          </div>

          {message && <p className="operation-success">{message}</p>}

          {error && <p className="operation-error">{error}</p>}
        </div>
      </section>

      <section className="operations-section">
        <h2>Transferência</h2>

        <div className="operation-card">
          <label htmlFor="transfer-account">Conta de destino</label>
          <input
            id="transfer-account"
            type="text"
            inputMode="numeric"
            maxLength={8}
            placeholder="8 dígitos"
            value={transferAccount}
            onChange={(event) => setTransferAccount(event.target.value)}
          />

          <label htmlFor="transfer-amount">Valor da transferência</label>
          <input
            id="transfer-amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Ex: 50.00"
            value={transferAmount}
            onChange={(event) => setTransferAmount(event.target.value)}
          />

          <button type="button" disabled={transferLoading} onClick={handleTransfer}>
            {transferLoading ? "Processando..." : "Transferir"}
          </button>

          {transferMessage && <p className="operation-success">{transferMessage}</p>}
          {transferError && <p className="operation-error">{transferError}</p>}
        </div>
      </section>

      <section className="transfer-section" id="transfer">
  <h2>Transferência bancária</h2>

  <div className="transfer-card">
    <label htmlFor="transferAccount">
      Número da conta de destino
    </label>

    <input
      id="transferAccount"
      type="text"
      maxLength={8}
      placeholder="Ex: 12345678"
      value={transferAccount}
      onChange={(event) =>
        setTransferAccount(event.target.value.replace(/\D/g, ""))
      }
    />

    <label htmlFor="transferAmount">
      Valor da transferência
    </label>

    <input
      id="transferAmount"
      type="number"
      min="0.01"
      step="0.01"
      placeholder="Ex: 50.00"
      value={transferAmount}
      onChange={(event) => setTransferAmount(event.target.value)}
    />

    <button
      type="button"
      disabled={transferLoading}
      onClick={handleTransfer}
    >
      {transferLoading ? "Transferindo..." : "Confirmar transferência"}
    </button>

    {transferMessage && (
      <p className="transfer-success">{transferMessage}</p>
    )}

    {transferError && (
      <p className="transfer-error">{transferError}</p>
    )}
  </div>
</section>

      <section className="pix-section" id="pix">
        <h2>Pagamento via Pix</h2>

        <div className="operation-card">
          <label htmlFor="pix-key">Chave Pix</label>
          <input
            id="pix-key"
            type="text"
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            value={pixKey}
            onChange={(event) => setPixKey(event.target.value)}
          />

          <label htmlFor="pix-amount">Valor do Pix</label>
          <input
            id="pix-amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Ex: 30.00"
            value={pixAmount}
            onChange={(event) => setPixAmount(event.target.value)}
          />

          <button type="button" disabled={pixLoading} onClick={handlePix}>
            {pixLoading ? "Processando..." : "Enviar Pix"}
          </button>

          {pixMessage && <p className="operation-success">{pixMessage}</p>}
          {pixError && <p className="operation-error">{pixError}</p>}
        </div>
      </section>

      <section className="pix-section">
  <h2>Enviar Pix</h2>

  <div className="pix-card">

    <label htmlFor="pixKey">
      Chave Pix do destinatário
    </label>

    <input
      id="pixKey"
      type="text"
      placeholder="Digite a chave Pix"
      value={pixKey}
      onChange={(event) => setPixKey(event.target.value)}
    />

    <label htmlFor="pixAmount">
      Valor do Pix
    </label>

    <input
      id="pixAmount"
      type="number"
      min="0.01"
      step="0.01"
      placeholder="Ex: 30.00"
      value={pixAmount}
      onChange={(event) => setPixAmount(event.target.value)}
    />

    <button
      type="button"
      disabled={pixLoading}
      onClick={handlePix}
    >
      {pixLoading ? "Enviando Pix..." : "Enviar Pix"}
    </button>

    {pixMessage && (
      <p className="pix-success">{pixMessage}</p>
    )}

    {pixError && (
      <p className="pix-error">{pixError}</p>
    )}

  </div>
</section>

    <section className="pix-keys-section" id="pix-keys">
  <h2>Minhas chaves Pix</h2>

  <div className="pix-keys-card">
    <h3>Cadastrar nova chave</h3>

    <label htmlFor="pixKeyType">Tipo da chave</label>

    <select
      id="pixKeyType"
      value={pixKeyType}
      onChange={(event) => setPixKeyType(event.target.value)}
    >
      <option value="EMAIL">E-mail</option>
      <option value="CPF">CPF</option>
      <option value="PHONE">Telefone</option>
    </select>

    <label htmlFor="newPixKey">Chave Pix</label>

    <input
      id="newPixKey"
      type="text"
      placeholder="Digite sua chave Pix"
      value={newPixKey}
      onChange={(event) => setNewPixKey(event.target.value)}
    />

    <button
      type="button"
      disabled={pixKeyLoading}
      onClick={handleCreatePixKey}
    >
      {pixKeyLoading ? "Processando..." : "Cadastrar chave"}
    </button>

    {pixKeyMessage && (
      <p className="pix-key-success">{pixKeyMessage}</p>
    )}

    {pixKeyError && (
      <p className="pix-key-error">{pixKeyError}</p>
    )}
  </div>

  <div className="registered-keys">
    <h3>Chaves cadastradas</h3>

    {pixKeys.length === 0 ? (
      <p className="empty-statement">
        Você ainda não possui chaves Pix cadastradas.
      </p>
    ) : (
      pixKeys.map((pixKey) => (
        <article className="pix-key-item" key={pixKey.id}>
          <div>
            <strong>{pixKey.type}</strong>
            <p>{pixKey.key}</p>
          </div>

          <button
            type="button"
            disabled={pixKeyLoading}
            onClick={() => handleDeletePixKey(pixKey.id)}
          >
            Excluir
          </button>
        </article>
      ))
    )}
  </div>
  
  </section>

      <section className="statement-section" id="statement">
        <div className="statement-header">
          <h2>Extrato bancário</h2>
          <button
            type="button"
            className="export-pdf-button"
            onClick={handleExportStatement}
          >
            ↓ Exportar PDF
          </button>
          
          <div className="transaction-filters">
  <button
    className={transactionFilter === "ALL" ? "active" : ""}
    onClick={() => {
  setPeriodFilter("ALL");
  loadDashboard(1, transactionFilter, "ALL");
}}
  >
    Todas
  </button>

  <button
    className={transactionFilter === "DEPOSIT" ? "active" : ""}
    onClick={() => {
  setTransactionFilter("DEPOSIT");
  loadDashboard(1, "DEPOSIT");
}}
  >
    Depósitos
  </button>

  <button
    className={transactionFilter === "WITHDRAWAL" ? "active" : ""}
    onClick={() => {
  setTransactionFilter("WITHDRAWAL");
  loadDashboard(1, "WITHDRAWAL");
}}
  >
    Saques
  </button>

  <button
    className={transactionFilter === "PIX" ? "active" : ""}
   onClick={() => {
  setTransactionFilter("PIX");
  loadDashboard(1, "PIX");
}}
  >
    Pix
  </button>

  <button
    className={transactionFilter === "TRANSFER" ? "active" : ""}
    onClick={() => {
  setTransactionFilter("TRANSFER");
  loadDashboard(1, "TRANSFER");
}}
  >
    Transferências
  </button>
</div>

<div className="period-filters">
  <span>Período:</span>

  <button
    className={periodFilter === "TODAY" ? "active" : ""}
    onClick={() => {
  setPeriodFilter("TODAY");
  loadDashboard(1, transactionFilter, "TODAY");
}}
  >
    Hoje
  </button>

  <button
    className={periodFilter === "7_DAYS" ? "active" : ""}
    onClick={() => {
  setPeriodFilter("7_DAYS");
  loadDashboard(1, transactionFilter, "7_DAYS");
}}
  >
    7 dias
  </button>

  <button
    className={periodFilter === "30_DAYS" ? "active" : ""}
    onClick={() => setPeriodFilter("30_DAYS")}
  >
    30 dias
  </button>

  <button
    className={periodFilter === "ALL" ? "active" : ""}
    onClick={() => {
  setPeriodFilter("30_DAYS");
  loadDashboard(1, transactionFilter, "30_DAYS");
}}
  >
    Todo o período
  </button>
</div>
          <label htmlFor="transaction-filter">
            Filtrar:
            <select
              id="transaction-filter"
              value={transactionFilter}
              onChange={(event) => {
                const { value } = event.target;
                if (isTransactionFilter(value)) {
                  setTransactionFilter(value);
                }
              }}
            >
              <option value="ALL">Todas</option>
              <option value="DEPOSIT">Depósitos</option>
              <option value="WITHDRAWAL">Saques</option>
              <option value="TRANSFER">Transferências</option>
              <option value="PIX">Pix</option>
            </select>
          </label>
          <label htmlFor="period-filter">
            Período:
            <select
              id="period-filter"
              value={periodFilter}
              onChange={(event) => {
                const { value } = event.target;
                if (isPeriodFilter(value)) {
                  setPeriodFilter(value);
                }
              }}
            >
              <option value="ALL">Todo o período</option>
              <option value="TODAY">Hoje</option>
              <option value="7_DAYS">Últimos 7 dias</option>
              <option value="30_DAYS">Últimos 30 dias</option>
            </select>
          </label>
        </div>

        <div className="transaction-search">
          <input
  type="text"
  placeholder="Pesquisar movimentação..."
  value={searchTransaction}
  onChange={(e) => setSearchTransaction(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      loadDashboard(1, transactionFilter, periodFilter);
    }
  }}
/>

<button
  type="button"
  onClick={() =>
    loadDashboard(1, transactionFilter, periodFilter)
  }
>
  Pesquisar
</button>
        </div>

        {searchedTransactions.length === 0 ? (
        <div className="empty-statement">
        <div className="empty-statement-icon">⌕</div>

        <h3>Nenhuma movimentação encontrada</h3>

        <p>
          Não encontramos transações com os filtros selecionados.
          Experimente alterar sua pesquisa ou os filtros.
        </p>
          </div>
          ) : (
          <div className="transaction-list">
            {searchedTransactions.map((transaction) => (
              <article className="transaction-item" key={transaction.id}>
                <div className="transaction-info">
                  <h3>{formatTransactionType(transaction.type)}</h3>

                  <p>
                    {transaction.description || "Movimentação bancária"}
                  </p>

                  <span>
                    {new Date(transaction.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>

                <div className="transaction-value">
                  <strong>{formatCurrency(transaction.amount)}</strong>

                  <span>
                    {transaction.status === "COMPLETED"
                      ? "Concluída"
                      : transaction.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <nav className="pagination-controls" aria-label="Paginação do extrato">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Anterior
            </button>
            <span>
              Página {pagination.page} de {pagination.totalPages} (
              {pagination.total} movimentações)
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Próxima
            </button>
          </nav>
        )}
        {paginationError && (
          <p className="operation-error">{paginationError}</p>
        )}
      </section>

      <section className="profile-section" id="profile">
  <div className="section-header">
    <h2>Meu Perfil</h2>
    <p>Gerencie suas informações pessoais.</p>
  </div>

  <div className="profile-card">
    <div className="profile-field">
      <label htmlFor="profile-name">Nome completo</label>

      <input
        id="profile-name"
        type="text"
        value={profileName}
        onChange={(event) => setProfileName(event.target.value)}
        placeholder="Digite seu nome"
      />
    </div>

        <div className="profile-card password-card" id="security">
  <div className="section-header">
    <h2>Segurança</h2>
    <p>Altere sua senha para manter sua conta protegida.</p>
  </div>

  <div className="profile-field">
    <label htmlFor="current-password">Senha atual</label>

    <input
      id="current-password"
      type="password"
      value={currentPassword}
      onChange={(event) => setCurrentPassword(event.target.value)}
      placeholder="Digite sua senha atual"
    />
  </div>

  <div className="profile-field">
    <label htmlFor="new-password">Nova senha</label>

    <input
      id="new-password"
      type="password"
      value={newPassword}
      onChange={(event) => setNewPassword(event.target.value)}
      placeholder="Digite sua nova senha"
    />
  </div>

  <div className="profile-field">
    <label htmlFor="confirm-password">Confirmar nova senha</label>

    <input
      id="confirm-password"
      type="password"
      value={confirmPassword}
      onChange={(event) => setConfirmPassword(event.target.value)}
      placeholder="Confirme sua nova senha"
    />
  </div>

  <button
    className="profile-save-button"
    onClick={handleChangePassword}
    disabled={passwordLoading}
  >
    {passwordLoading ? "Alterando..." : "Alterar senha"}
  </button>

  {passwordMessage && (
    <p className="operation-success">{passwordMessage}</p>
  )}

  {passwordError && (
    <p className="operation-error">{passwordError}</p>
  )}

  <div className="security-activity-header">
    <h3>Atividade recente</h3>
    <button
      type="button"
      className="security-refresh-button"
      onClick={() => void loadSecurityActivities()}
      disabled={securityLoading}
    >
      {securityLoading ? "Carregando..." : "Atualizar"}
    </button>
  </div>

  {securityError && (
    <p className="operation-error" role="alert">{securityError}</p>
  )}

  {securityLoading && securityActivities.length === 0 ? (
    <p className="security-activity-empty">Carregando atividades...</p>
  ) : securityActivities.length === 0 ? (
    <p className="security-activity-empty">
      Nenhuma atividade de segurança registrada.
    </p>
  ) : (
    <ul className="security-activity-list">
      {securityActivities.map((activity) => (
        <li key={activity.id}>
          <strong>{activity.type.replaceAll("_", " ")}</strong>
          <span>{activity.description}</span>
          <time dateTime={activity.createdAt}>
            {new Date(activity.createdAt).toLocaleString("pt-BR")}
          </time>
        </li>
      ))}
    </ul>
  )}
</div>

    <div className="profile-field">
      <label htmlFor="profile-email">E-mail</label>

      <input
        id="profile-email"
        type="email"
        value={profileEmail}
        onChange={(event) => setProfileEmail(event.target.value)}
        placeholder="Digite seu e-mail"
      />
    </div>

    <button
      className="profile-save-button"
      onClick={handleUpdateProfile}
      disabled={profileLoading}
    >
      {profileLoading ? "Salvando..." : "Salvar alterações"}
    </button>

    {profileMessage && (
      <p className="operation-success">{profileMessage}</p>
    )}

    {profileError && (
      <p className="operation-error">{profileError}</p>
    )}
  </div>

  <div className="profile-card">
    <h3>Alterar senha</h3>

    <div className="profile-field">
      <label htmlFor="current-password">Senha atual</label>
      <input
        id="current-password"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
      />
    </div>

    <div className="profile-field">
      <label htmlFor="new-password">Nova senha</label>
      <input
        id="new-password"
        type="password"
        autoComplete="new-password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
      />
    </div>

    <div className="profile-field">
      <label htmlFor="confirm-password">Confirmar nova senha</label>
      <input
        id="confirm-password"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />
    </div>

    <button
      type="button"
      className="profile-save-button"
      onClick={handleChangePassword}
      disabled={passwordLoading}
    >
      {passwordLoading ? "Alterando..." : "Alterar senha"}
    </button>

    {passwordMessage && (
      <p className="operation-success">{passwordMessage}</p>
    )}

    {passwordError && (
      <p className="operation-error">{passwordError}</p>
    )}
  </div>
</section>
<section className="security-section" id="security">
  <div className="section-header">
    <h2>Central de Segurança</h2>
    <p>Acompanhe as atividades e os eventos de segurança da sua conta.</p>
  </div>

  <div className="security-card">
    <div className="security-card-header">
      <div>
        <h3>Histórico de atividades</h3>
        <p>Confira os últimos eventos relacionados à proteção da sua conta.</p>
      </div>

      <span className="security-status">Conta monitorada</span>
    </div>

    {securityLoading && (
      <p className="security-feedback">
        Carregando atividades de segurança...
      </p>
    )}

    {securityError && (
      <p className="operation-error">{securityError}</p>
    )}

    {!securityLoading &&
      !securityError &&
      securityActivities.length === 0 && (
        <div className="security-empty">
          <h3>Nenhuma atividade registrada</h3>
          <p>
            As atividades de segurança da sua conta aparecerão aqui.
          </p>
        </div>
      )}

    {!securityLoading && securityActivities.length > 0 && (
      <div className="security-activity-list">
        {securityActivities.map((activity) => (
          <article className="security-activity-item" key={activity.id}>
            <div className="security-activity-icon">
              {activity.type === "LOGIN"
                ? "✓"
                : activity.type === "FAILED_LOGIN"
                ? "!"
                : activity.type === "PASSWORD_CHANGED" ||
                  activity.type === "PASSWORD_RESET_COMPLETED"
                ? "🔒"
                : "•"}
            </div>

            <div className="security-activity-info">
              <h4>
                {activity.type.replaceAll("_", " ")}
              </h4>

              <p>{activity.description}</p>

              <span>
                {new Date(activity.createdAt).toLocaleString("pt-BR")}
              </span>
            </div>
          </article>
        ))}
      </div>
    )}
  </div>
</section>
    </main>
  </div>
  );
}

export default Dashboard;
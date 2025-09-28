-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('PENDING', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "ShareStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('NOTECRYPT', 'ECRYPT');

-- CreateEnum
CREATE TYPE "ShamirSessionStatus" AS ENUM ('CUSTOM', 'ASYMMETRIC');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "DkgSessionStatus" AS ENUM ('LOBBY', 'ROUND1', 'ROUND2', 'ROUND3', 'FINAL', 'ABORTED');

-- CreateEnum
CREATE TYPE "DkgShareDelivery" AS ENUM ('SENT', 'DELIVERED', 'READ', 'REJECTED');

-- CreateEnum
CREATE TYPE "DkgComplaintStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DkgRecoveryStatus" AS ENUM ('OPEN', 'VERIFYING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('scheduled', 'finished');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "oauth_token_secret" TEXT,
    "oauth_token" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "surname" TEXT DEFAULT '',
    "patronymic" TEXT DEFAULT '',
    "age" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "sex" "Sex" DEFAULT 'MALE',
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "publicKey" JSONB,
    "image" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "companyId" TEXT,
    "positionId" TEXT,
    "departmentId" TEXT,
    "managerId" TEXT,
    "telegramId" TEXT,
    "telegramUsername" TEXT,
    "telegramLinkedAt" TIMESTAMP(3),
    "telegramAllowsWrite" BOOLEAN NOT NULL DEFAULT false,
    "telegramPhotoUrl" TEXT,
    "telegramLanguageCode" TEXT,
    "telegramLastAuthAt" TIMESTAMP(3),
    "e2ePublicKey" TEXT,
    "e2ePublicKeyAlg" TEXT NOT NULL DEFAULT 'ECIES-GOST-2012-256',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "autoSessionLogout" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "darkMode" BOOLEAN NOT NULL DEFAULT false,
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ru',
    "logRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "notifyByEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyByTelegram" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "ShamirSession" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commitments" JSONB NOT NULL DEFAULT '[]',
    "g" TEXT NOT NULL DEFAULT '',
    "p" TEXT NOT NULL DEFAULT '',
    "q" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT '',
    "title" TEXT,
    "type" "ShamirSessionStatus" NOT NULL DEFAULT 'CUSTOM',

    CONSTRAINT "ShamirSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Share" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "x" TEXT NOT NULL,
    "ciphertext" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL DEFAULT '',
    "comment" TEXT NOT NULL DEFAULT '',
    "encryptionAlgorithm" TEXT NOT NULL DEFAULT 'RSA-OAEP-SHA256',
    "expiresAt" TIMESTAMP(3),
    "status" "ShareStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsymmetricKey" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "privateKeySharingId" TEXT NOT NULL,
    "p" TEXT NOT NULL,
    "a" TEXT NOT NULL,
    "b" TEXT NOT NULL,
    "q" TEXT NOT NULL,
    "xp" TEXT NOT NULL,
    "yp" TEXT NOT NULL,
    "Q" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,

    CONSTRAINT "AsymmetricKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoverySession" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "shareSessionId" TEXT NOT NULL,
    "status" "RecoveryStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "RecoverySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareReceipt" (
    "id" TEXT NOT NULL,
    "recoveryId" TEXT NOT NULL,
    "shareholderId" TEXT NOT NULL,
    "ciphertext" JSONB NOT NULL DEFAULT '[]',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shareSessionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "ShareReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "DocumentStatus" DEFAULT 'NOTECRYPT',

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentSignSession" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "hash" TEXT,
    "documentId" TEXT NOT NULL,
    "status" "RecoveryStatus" NOT NULL DEFAULT 'PENDING',
    "recoveryId" TEXT NOT NULL,
    "publicKeyId" TEXT,
    "r" TEXT DEFAULT '',
    "s" TEXT DEFAULT '',

    CONSTRAINT "documentSignSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signatures" (
    "id" TEXT NOT NULL,
    "documentId" TEXT,
    "userId" TEXT NOT NULL,
    "filePath" TEXT,
    "pem" TEXT,
    "shamirSessionId" TEXT,
    "type" TEXT NOT NULL,
    "path" TEXT,

    CONSTRAINT "Signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '╨Ъ╨╛╨╝╨┐╨░╨╜╨╕╤П',
    "email" TEXT NOT NULL,
    "image" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '╨Ю╤В╨┤╨╡╨╗',
    "email" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '╨Ф╨╛╨╗╨╢╨╜╨╛╤Б╤В╤М',
    "companyId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '╨б╨╡╤А╤В╨╕╤Д╨╕╨║╨░╤В',
    "ownerId" TEXT NOT NULL,
    "asymmetricKeyId" TEXT,
    "pem" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DkgSession" (
    "id" TEXT NOT NULL,
    "title" TEXT DEFAULT '',
    "n" INTEGER NOT NULL,
    "t" INTEGER NOT NULL,
    "epoch" TEXT NOT NULL DEFAULT '2025Q3',
    "status" "DkgSessionStatus" NOT NULL DEFAULT 'LOBBY',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DkgSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DkgParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "e2ePublicKey" TEXT NOT NULL,
    "e2ePublicKeyAlg" TEXT NOT NULL DEFAULT 'ECIES-GOST-2012-256',
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "DkgParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DkgCommitment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "commitments" JSONB NOT NULL,
    "commitmentsHash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DkgCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DkgShareOutbox" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "transcriptHash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "status" "DkgShareDelivery" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "DkgShareOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DkgReady" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "Qhash" TEXT NOT NULL,
    "transcriptHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DkgReady_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DkgComplaint" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "accuserId" TEXT NOT NULL,
    "accusedId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "payload" JSONB NOT NULL,
    "status" "DkgComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DkgComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DkgRecoverySession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceSessionId" TEXT NOT NULL,
    "qHash" TEXT NOT NULL,
    "n" INTEGER NOT NULL,
    "t" INTEGER NOT NULL,
    "epoch" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "requesterPubKey" TEXT NOT NULL,
    "status" "DkgRecoveryStatus" NOT NULL DEFAULT 'OPEN',
    "resultCiphertext" TEXT,
    "resultMeta" TEXT,

    CONSTRAINT "DkgRecoverySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DkgRecoveryParticipant" (
    "id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recoveryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "e2ePublicKey" TEXT,

    CONSTRAINT "DkgRecoveryParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DkgRecoveryShare" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recoveryId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "s_i_hex" TEXT NOT NULL,
    "proofOk" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DkgRecoveryShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players_fifa" (
    "player_id" BIGINT,
    "age" DOUBLE PRECISION,
    "date_of_birth" TEXT,
    "first_name" TEXT,
    "club" TEXT,
    "shirt_number" BIGINT,
    "position" TEXT,
    "full_name" TEXT,
    "last_name" TEXT,
    "fifa_goals" BIGINT,
    "fifa_physic" BIGINT,
    "height" BIGINT,
    "gk_skill" BIGINT,
    "rb_skill" BIGINT,
    "cb_skill" BIGINT,
    "lb_skill" BIGINT,
    "rwb_skill" BIGINT,
    "dm_skill" BIGINT,
    "lwb_skill" BIGINT,
    "rm_skill" BIGINT,
    "cm_skill" BIGINT,
    "lm_skill" BIGINT,
    "rw_skill" BIGINT,
    "am_skill" BIGINT,
    "lw_skill" BIGINT,
    "st_skill" BIGINT,
    "stamina" BIGINT,
    "defending" BIGINT,
    "shooting" BIGINT,
    "pass" BIGINT,
    "goalkeeper_save" BIGINT,
    "id" BIGINT
);

-- CreateTable
CREATE TABLE "teams" (
    "id" BIGINT,
    "title" TEXT,
    "liga" BIGINT
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_e2ePublicKey_key" ON "User"("e2ePublicKey");

-- CreateIndex
CREATE INDEX "User_telegramUsername_idx" ON "User"("telegramUsername");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Share_sessionId_userId_key" ON "Share"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AsymmetricKey_privateKeySharingId_key" ON "AsymmetricKey"("privateKeySharingId");

-- CreateIndex
CREATE UNIQUE INDEX "AsymmetricKey_publicKey_key" ON "AsymmetricKey"("publicKey");

-- CreateIndex
CREATE INDEX "documents_userId_createdAt_idx" ON "documents"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "documentSignSession_recoveryId_key" ON "documentSignSession"("recoveryId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_email_key" ON "Company"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Department_email_key" ON "Department"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Certification_asymmetricKeyId_key" ON "Certification"("asymmetricKeyId");

-- CreateIndex
CREATE INDEX "DkgSession_status_createdAt_idx" ON "DkgSession"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DkgParticipant_sessionId_idx" ON "DkgParticipant"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "DkgParticipant_sessionId_userId_key" ON "DkgParticipant"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "DkgCommitment_sessionId_idx" ON "DkgCommitment"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "DkgCommitment_sessionId_fromUserId_key" ON "DkgCommitment"("sessionId", "fromUserId");

-- CreateIndex
CREATE INDEX "DkgShareOutbox_sessionId_toUserId_status_idx" ON "DkgShareOutbox"("sessionId", "toUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DkgShareOutbox_sessionId_fromUserId_toUserId_key" ON "DkgShareOutbox"("sessionId", "fromUserId", "toUserId");

-- CreateIndex
CREATE INDEX "DkgReady_sessionId_idx" ON "DkgReady"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "DkgReady_sessionId_userId_key" ON "DkgReady"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "DkgComplaint_sessionId_status_idx" ON "DkgComplaint"("sessionId", "status");

-- CreateIndex
CREATE INDEX "DkgRecoverySession_sourceSessionId_status_createdAt_idx" ON "DkgRecoverySession"("sourceSessionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DkgRecoveryParticipant_recoveryId_idx" ON "DkgRecoveryParticipant"("recoveryId");

-- CreateIndex
CREATE UNIQUE INDEX "DkgRecoveryParticipant_recoveryId_userId_key" ON "DkgRecoveryParticipant"("recoveryId", "userId");

-- CreateIndex
CREATE INDEX "DkgRecoveryShare_recoveryId_idx" ON "DkgRecoveryShare"("recoveryId");

-- CreateIndex
CREATE UNIQUE INDEX "DkgRecoveryShare_recoveryId_fromUserId_key" ON "DkgRecoveryShare"("recoveryId", "fromUserId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ShamirSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsymmetricKey" ADD CONSTRAINT "AsymmetricKey_privateKeySharingId_fkey" FOREIGN KEY ("privateKeySharingId") REFERENCES "ShamirSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoverySession" ADD CONSTRAINT "RecoverySession_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoverySession" ADD CONSTRAINT "RecoverySession_shareSessionId_fkey" FOREIGN KEY ("shareSessionId") REFERENCES "ShamirSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareReceipt" ADD CONSTRAINT "ShareReceipt_recoveryId_fkey" FOREIGN KEY ("recoveryId") REFERENCES "RecoverySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareReceipt" ADD CONSTRAINT "ShareReceipt_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareReceipt" ADD CONSTRAINT "ShareReceipt_shareSessionId_shareholderId_fkey" FOREIGN KEY ("shareSessionId", "shareholderId") REFERENCES "Share"("sessionId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareReceipt" ADD CONSTRAINT "ShareReceipt_shareholderId_fkey" FOREIGN KEY ("shareholderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentSignSession" ADD CONSTRAINT "documentSignSession_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentSignSession" ADD CONSTRAINT "documentSignSession_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentSignSession" ADD CONSTRAINT "documentSignSession_publicKeyId_fkey" FOREIGN KEY ("publicKeyId") REFERENCES "AsymmetricKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentSignSession" ADD CONSTRAINT "documentSignSession_recoveryId_fkey" FOREIGN KEY ("recoveryId") REFERENCES "RecoverySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signatures" ADD CONSTRAINT "Signatures_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signatures" ADD CONSTRAINT "Signatures_shamirSessionId_fkey" FOREIGN KEY ("shamirSessionId") REFERENCES "ShamirSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signatures" ADD CONSTRAINT "Signatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_asymmetricKeyId_fkey" FOREIGN KEY ("asymmetricKeyId") REFERENCES "AsymmetricKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgSession" ADD CONSTRAINT "DkgSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgParticipant" ADD CONSTRAINT "DkgParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DkgSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgParticipant" ADD CONSTRAINT "DkgParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgCommitment" ADD CONSTRAINT "DkgCommitment_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgCommitment" ADD CONSTRAINT "DkgCommitment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DkgSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgShareOutbox" ADD CONSTRAINT "DkgShareOutbox_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgShareOutbox" ADD CONSTRAINT "DkgShareOutbox_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DkgSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgShareOutbox" ADD CONSTRAINT "DkgShareOutbox_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgReady" ADD CONSTRAINT "DkgReady_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DkgSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgReady" ADD CONSTRAINT "DkgReady_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgComplaint" ADD CONSTRAINT "DkgComplaint_accusedId_fkey" FOREIGN KEY ("accusedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgComplaint" ADD CONSTRAINT "DkgComplaint_accuserId_fkey" FOREIGN KEY ("accuserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgComplaint" ADD CONSTRAINT "DkgComplaint_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DkgSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgRecoverySession" ADD CONSTRAINT "DkgRecoverySession_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgRecoverySession" ADD CONSTRAINT "DkgRecoverySession_sourceSessionId_fkey" FOREIGN KEY ("sourceSessionId") REFERENCES "DkgSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgRecoveryParticipant" ADD CONSTRAINT "DkgRecoveryParticipant_recoveryId_fkey" FOREIGN KEY ("recoveryId") REFERENCES "DkgRecoverySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgRecoveryParticipant" ADD CONSTRAINT "DkgRecoveryParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgRecoveryShare" ADD CONSTRAINT "DkgRecoveryShare_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DkgRecoveryShare" ADD CONSTRAINT "DkgRecoveryShare_recoveryId_fkey" FOREIGN KEY ("recoveryId") REFERENCES "DkgRecoverySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;


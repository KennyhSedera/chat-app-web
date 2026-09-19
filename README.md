# 🌐 Chat App — Web

Interface Web de l'application de messagerie temps réel **Chat App**, développée avec **Next.js**.

Elle permet aux utilisateurs d'accéder à leurs conversations depuis un navigateur et de communiquer en temps réel avec les utilisateurs de l'application mobile.

## ✨ Fonctionnalités

* 💬 Messagerie temps réel
* 🏠 Gestion des salons
* 📩 Envoi et réception instantanés
* 📜 Historique des messages
* 👁️ Messages lus
* ⌨️ Indicateur de saisie
* ✏️ Modification des messages
* 👍 Réactions
* 🔄 Reconnexion automatique
* 🔐 Authentification
* 👤 Gestion du compte
* 💻 Interface responsive

## 🛠️ Technologies

* Next.js
* React
* TypeScript
* Socket.IO Client
* CSS / UI Components
* React Context API

## 📂 Structure

```text
app-web/
├── app/
│   ├── app/
│   ├── dev/
│   ├── login/
│   └── ...
│
├── components/
│   ├── Chat/
│   ├── Message/
│   ├── Room/
│   └── ...
│
├── context/
│   ├── AuthContext.tsx
│   ├── ChatContext.tsx
│   └── ...
│
├── hooks/
│   └── ...
│
├── lib/
│   └── ...
│
├── public/
│   └── ...
│
├── package.json
└── README.md
```

## 🚀 Installation

```bash
git clone <URL_DU_REPOSITORY>
cd app-web
npm install
```

## ⚙️ Configuration

Créer un fichier `.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Adapter l'adresse selon l'environnement de développement ou de production.

## ▶️ Développement

```bash
npm run dev
```

L'application est généralement accessible à :

```text
http://localhost:3000
```

## 🏗️ Production

Construire l'application :

```bash
npm run build
```

Puis :

```bash
npm start
```

## 💬 Messagerie temps réel

La communication temps réel utilise Socket.IO Client.

```text
                  ┌───────────────┐
                  │   PostgreSQL  │
                  └───────┬───────┘
                          │
                    ┌─────▼─────┐
                    │  Backend  │
                    │ Socket.IO │
                    └─────┬─────┘
                          │
             ┌────────────┴────────────┐
             │                         │
       Socket.IO                 Socket.IO
             │                         │
      ┌──────▼──────┐          ┌──────▼──────┐
      │     Web     │          │   Mobile    │
      │   Next.js   │          │ Expo / RN   │
      └─────────────┘          └─────────────┘
```

Les messages peuvent donc être échangés entre :

* utilisateur Web → utilisateur Web
* utilisateur Web → utilisateur Mobile
* utilisateur Mobile → utilisateur Web
* utilisateur Mobile → utilisateur Mobile

## 🔌 Événements Socket.IO

Le frontend utilise notamment les événements :

```text
previousRoomMessages
newRoomMessage
roomRead
messageEdited
reactions
typing
```

## 📩 Messages

Lorsqu'un message est envoyé depuis le Web :

```text
Web
 │
 │ send
 ▼
Socket.IO
 │
 ▼
Backend
 │
 ├── PostgreSQL
 │
 └── Broadcast
       │
       ├── Web
       └── Mobile
```

Le nouveau message apparaît automatiquement chez les utilisateurs concernés.

## 👁️ Read Receipts

L'application permet de suivre la lecture des messages.

L'événement :

```text
roomRead
```

permet de synchroniser l'état de lecture entre les clients.

## ⌨️ Typing Indicator

L'événement :

```text
typing
```

permet d'afficher lorsqu'un utilisateur est en train d'écrire.

## ✏️ Modification des messages

Lorsqu'un message est modifié, l'événement :

```text
messageEdited
```

permet de mettre à jour le message chez les autres utilisateurs connectés.

## 👍 Réactions

Les utilisateurs peuvent réagir aux messages.

Les réactions sont synchronisées instantanément grâce à :

```text
reactions
```

## 🔐 Authentification

L'authentification utilise une session conservée dans un cookie :

```text
session
```

Le cookie est géré par le backend et utilisé pour authentifier les requêtes.

## 🔄 Reconnexion

Socket.IO est configuré pour tenter automatiquement de rétablir la connexion en cas de perte temporaire du réseau.

## 🎨 Interface

L'interface Web est conçue pour fonctionner sur différentes tailles d'écran.

Elle comprend notamment :

* liste des salons
* zone de conversation
* liste des messages
* champ de saisie
* réactions
* statut de lecture
* indicateur de saisie

## 🧪 Développement

Lancer le serveur de développement :

```bash
npm run dev
```

Vérifier le code :

```bash
npm run lint
```

Construire l'application :

```bash
npm run build
```

## 📄 Licence

Projet développé dans le cadre d'une application de messagerie temps réel multiplateforme.

---

### Stack

**Next.js · React · TypeScript · Socket.IO Client · Node.js · PostgreSQL**


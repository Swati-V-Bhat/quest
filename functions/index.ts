const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

/**
 * Triggered when a quest document is deleted from Firestore.
 * This function cleans up all associated data to maintain database integrity.
 *
 * @param {functions.firestore.DocumentSnapshot} snap The snapshot of the deleted quest data.
 * @param {functions.EventContext} context The event context.
 * @returns {Promise<void>} A promise that resolves when cleanup is complete.
 */
exports.onQuestDeleted = functions.firestore
    .document("Quest/{questId}")
    .onDelete(async (snap: { data: () => any; }, context: { params: { questId: any; }; }) => {
      const deletedQuest = snap.data();
      const questId = context.params.questId;
      const batch = db.batch();

      // 1. Delete the associated chat document.
      const chatId = deletedQuest.chatId;
      if (chatId) {
        const chatRef = db.doc(`chats/${chatId}`);
        const messagesRef = db.collection(`chats/${chatId}/messages`);

        // Delete all messages in the chat subcollection.
        try {
          const messagesSnapshot = await messagesRef.get();
          messagesSnapshot.docs.forEach((doc: { ref: any; }) => batch.delete(doc.ref));
          console.log(
              `Scheduled deletion for ${messagesSnapshot.size} messages in chat ${chatId}`
          );
        } catch (error) {
          console.error(`Failed to list messages for chat ${chatId}:`, error);
        }

        // Delete the parent chat document.
        batch.delete(chatRef);
        console.log(`Scheduled deletion for chat: ${chatId}`);
      }

      // 2. Remove the questId from each member's user profile.
      const members = deletedQuest.members;
      if (members) {
        const memberIds = Object.keys(members);
        memberIds.forEach((uid) => {
          const userRef = db.doc(`users/${uid}`);
          batch.update(userRef, {
            questIds: admin.firestore.FieldValue.arrayRemove(questId),
          });
          console.log(`Scheduled questId removal for user: ${uid}`);
        });
      }

      // 3. Commit all batched operations.
      try {
        await batch.commit();
        console.log(`Successfully cleaned up data for deleted quest: ${questId}`);
      } catch (error) {
        console.error(`Error during cleanup for quest ${questId}:`, error);
      }
    });


/**
 * Triggered when an email verification document is created.
 * Sends a verification code email to the user.
 * Configure with: firebase functions:config:set email.user="your@gmail.com" email.pass="app-password"
 */
exports.onEmailVerificationCreated = functions.firestore
    .document("emailVerifications/{email}")
    .onCreate(async (snap: { data: () => any; id: string; }) => {
      const data = snap.data();
      const email = data.email;
      const code = data.code;

      // Log for development (remove in production)
      console.log(`Verification code for ${email}: ${code}`);

      // TODO: Uncomment and configure for production email sending
      // const nodemailer = require('nodemailer');
      // const transporter = nodemailer.createTransport({
      //   service: 'gmail',
      //   auth: { user: functions.config().email?.user, pass: functions.config().email?.pass }
      // });
      // await transporter.sendMail({
      //   from: '"OnQuest" <noreply@onquest.app>',
      //   to: email,
      //   subject: 'Your OnQuest Verification Code',
      //   html: `<h2>Your code: <strong>${code}</strong></h2><p>Expires in 10 minutes.</p>`
      // });

      console.log(`Verification request logged for: ${email}`);
    });

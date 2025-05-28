import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    matricule: String,
    nom: String,
    prenom: String,
    mail: String,
    statut: String,
  },
  { _id: false }
);

const ListeSchema = new mongoose.Schema(
  {
    listName: { type: String, required: true },
    listType: { type: String, required: true },
    participants: [participantSchema],
    totalParticipants: { type: Number, default: 0 },
    responseRate: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Liste", ListeSchema);

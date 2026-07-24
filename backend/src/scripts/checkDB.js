require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose.connect(uri).then(async () => {
  const AQ = mongoose.model('AptitudeQuestion', new mongoose.Schema({
    topic: String, subtopic: String, companies: [String], difficulty: String
  }));

  const counts = await AQ.aggregate([{ $group: { _id: '$topic', count: { $sum: 1 } } }]);
  console.log('Topic counts:', JSON.stringify(counts, null, 2));

  const companies = await AQ.aggregate([
    { $unwind: '$companies' },
    { $group: { _id: '$companies', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 15 }
  ]);
  console.log('Company counts:', JSON.stringify(companies, null, 2));

  const subtopics = await AQ.distinct('subtopic');
  console.log('All subtopics:', subtopics.join(', '));

  const total = await AQ.countDocuments();
  console.log('Total questions:', total);

  await mongoose.disconnect();
});

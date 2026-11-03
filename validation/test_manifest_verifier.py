import hashlib,json,tempfile,unittest
from pathlib import Path
from verify_manifest import verify
class ManifestVerifierTests(unittest.TestCase):
 def test_valid_artifact_hashes(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);artifact=root/"predictions.csv";artifact.write_text("sample_id,actual,predicted\n1,a,a\n")
   sha=hashlib.sha256(artifact.read_bytes()).hexdigest()
   manifest={"experimentId":"trial-1","dataset":{},"split":"test","preprocessing":{},"seed":1,"model":{},"software":{},"sourceCommit":"a"*40,"artifacts":[{"path":"predictions.csv","sha256":sha,"role":"predictions"}]}
   path=root/"manifest.json";path.write_text(json.dumps(manifest))
   self.assertEqual(verify(path)["artifactCount"],1)
 def test_hash_mismatch_is_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/"data.bin").write_bytes(b"data")
   manifest={"experimentId":"trial-2","dataset":{},"split":"test","preprocessing":{},"seed":1,"model":{},"software":{},"sourceCommit":"b"*40,"artifacts":[{"path":"data.bin","sha256":"0"*64}]}
   path=root/"manifest.json";path.write_text(json.dumps(manifest))
   with self.assertRaisesRegex(ValueError,"mismatch"):verify(path)
if __name__=="__main__":unittest.main()

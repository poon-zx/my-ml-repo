import type { MDXComponents } from "mdx/types";
import AdamOptimizerDemo from "./AdamOptimizerDemo";
import BertInputEmbeddingDemo from "./BertInputEmbeddingDemo";
import BertMlmMaskingDemo from "./BertMlmMaskingDemo";
import BertNspDemo from "./BertNspDemo";
import AttentionDemo from "./AttentionDemo";
import DqnReplayDemo from "./DqnReplayDemo";
import FenwickTreeDemo from "./FenwickTreeDemo";
import GanLatentMapDemo from "./GanLatentMapDemo";
import GrpoPlaygroundDemo from "./GrpoPlaygroundDemo";
import KosarajuSccDemo from "./KosarajuSccDemo";
import KmpFailureTableDemo from "./KmpFailureTableDemo";
import KmpSearchDemo from "./KmpSearchDemo";
import PatchEmbeddingDemo from "./PatchEmbeddingDemo";
import RopeFrequencyDemo from "./RopeFrequencyDemo";

export const mdxComponents: MDXComponents = {
  a: (props) => (
    <a {...props} target="_blank" rel="noreferrer noopener" />
  ),
  AdamOptimizerDemo,
  BertInputEmbeddingDemo,
  BertMlmMaskingDemo,
  BertNspDemo,
  AttentionDemo,
  DqnReplayDemo,
  FenwickTreeDemo,
  GanLatentMapDemo,
  GrpoPlaygroundDemo,
  KosarajuSccDemo,
  KmpFailureTableDemo,
  KmpSearchDemo,
  PatchEmbeddingDemo,
  RopeFrequencyDemo,
};

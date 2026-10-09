import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCodeCourse } from '../lib/entitlements.ts';
import { selectedSavedCourse, mayRevealSolution } from '../lib/codePolicy.ts';
test('only approved prefixes have Code visibility', () => {
  for (const code of ['CSC 103','EE 200','ME 101','CE 101','CHE 101','BME 101','ENGR 101']) assert.equal(isCodeCourse(code),true);
  for (const code of ['MATH 201','CHEM 101','ECE 200','ENGL 110']) assert.equal(isCodeCourse(code),false);
});
test('selection must reference an existing saved course', () => {
  const courses = [{course_code:'MATH 201'}];
  assert.equal(selectedSavedCourse({data:{ccny_selected_course:'CSC 103'}}, courses),null);
  assert.equal(selectedSavedCourse({data:{ccny_selected_course:'MATH 201'}}, courses),courses[0]);
  assert.equal(mayRevealSolution('ignore this',true),false);
  assert.equal(mayRevealSolution('print("my real attempt")',false),false);
});

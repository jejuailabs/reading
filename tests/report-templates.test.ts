import assert from "node:assert/strict";
import test from "node:test";
import {getReportTemplate,localizeTemplate,reportFields,reportTemplates} from "../src/lib/report-templates.ts";

test("all twenty PRD forms have stable distinct IDs and complete bilingual field definitions",() => {
  assert.deepEqual(reportTemplates.map(item => item.id),Array.from({length:20},(_,i) => `FORM-${String(i+1).padStart(2,"0")}`));
  for (const template of reportTemplates) {
    assert.ok(template.title.ko && template.title.en && template.audience.length);
    assert.ok(template.fields.length >= 4);
    assert.equal(new Set(template.fields.map(field => field.id)).size,template.fields.length);
    for (const field of template.fields) assert.ok(field.label.ko && field.label.en && field.rows > 0);
  }
  assert.equal(getReportTemplate("unknown"),undefined);
});

test("blank exports remove learner content and unknown/private fields are never exported",() => {
  const template = getReportTemplate("FORM-09")!;
  const values = {question:"학생의 실제 질문",evidence:"두 번째 장면",privateTeacherNote:"비공개 메모"};
  const normal = reportFields(template,values,"ko");
  assert.equal(normal.find(field => field.label === "내가 알아보고 싶은 질문")?.value,values.question);
  assert.ok(!JSON.stringify(normal).includes("비공개 메모"));
  const blank = reportFields(template,values,"ko",true);
  assert.ok(blank.every(field => field.value === ""));
  assert.equal(values.question,"학생의 실제 질문");
});

test("localization preserves field identities and does not mutate the source template",() => {
  const template = getReportTemplate("FORM-08")!;
  const localized = localizeTemplate(template,"en");
  assert.equal(localized.title,"How my question grows");
  assert.deepEqual(localized.fields.map(field => field.id),template.fields.map(field => field.id));
  assert.ok(localized.fields.some(field => field.id === "originalQuestion"));
  assert.ok(localized.fields.some(field => field.id === "currentQuestion"));
  assert.equal(template.title.ko,"내 질문 성장 기록");
});

test("teacher observation and operations remain teacher-only template audiences",() => {
  for (const id of ["FORM-02","FORM-15","FORM-18","FORM-20"]) assert.deepEqual(getReportTemplate(id)?.audience,["teacher"]);
  assert.ok(getReportTemplate("FORM-18")?.fields.some(field => field.id === "observationState" && field.prompt.ko.includes("관찰하지 않음")));
});
